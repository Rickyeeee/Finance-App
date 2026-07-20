import { api, toast, catIcon, initAppName, swr } from '/js/api.js'
import { openAddTxnModal, openEditTxnModal, preloadTxnModalData } from '/js/txn-modal.js'

// 此模組由 build-spa 從 reconcile.html 抽出，router 每次進入頁面時呼叫 show()

// ── 帳單期間工具（模組層級：頁面與 prefetch 共用）──
// 根據結算日與扣款日，推算目前應預設顯示哪一期帳單
// 邏輯：
//   1. 找「最近一個結算日已到」的帳單月份（today >= billing_day → 當月；否則 → 上月）
//   2. 若該期的扣款日已過 → 代表這期已結束，推到下一期
function calcDefaultCardMonth(billingDay, paymentDay) {
  const now = new Date()
  const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  const td = parseInt(todayStr.slice(8), 10)
  const ty = parseInt(todayStr.slice(0, 4), 10)
  const tm = parseInt(todayStr.slice(5, 7), 10)

  if (!billingDay) return `${ty}-${String(tm).padStart(2,'0')}`

  let m = td > billingDay ? tm + 1 : tm
  let y = ty
  if (m > 12) { m = 1; y++ }

  if (paymentDay) {
    let pm = m - 1, py = y
    if (pm < 1) { pm = 12; py-- }

    const sameMonth = paymentDay > billingDay
    const prevPayT = new Date(py, sameMonth ? pm - 1 : pm, paymentDay)
    const prevPayStr = prevPayT.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })

    if (prevPayStr >= todayStr) {
      return `${py}-${String(pm).padStart(2,'0')}`
    }
  }

  return `${y}-${String(m).padStart(2,'0')}`
}

// ── 取得帳單期間 ──
function getBillingPeriod(billingDay, month) {
  const [y, m] = month.split('-').map(Number)
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  // 選 5 月 + 結算日 9 → 4/10～5/9（上月結算日+1 到本月結算日）
  const periodStart = new Date(y, m - 2, billingDay + 1)
  const periodEnd   = new Date(y, m - 1, billingDay)
  return { start: fmt(periodStart), end: fmt(periodEnd) }
}

// ── 取得帳單期間交易（含上期延後入帳）──
// useCache=true：先用 swr 快取（進頁/預載秒開）；網路結果一律回寫快取
async function fetchBillingTxns(cardName, billingDay, month, useCache = false) {
  const { start, end } = getBillingPeriod(billingDay, month)
  const [y, m] = month.split('-').map(Number)
  const prevMonthStr = new Date(y, m - 2, 1)
  const prevMonthKey = `${prevMonthStr.getFullYear()}-${String(prevMonthStr.getMonth()+1).padStart(2,'0')}`
  const { start: prevStart } = getBillingPeriod(billingDay, prevMonthKey)

  // 一次撈完 prevStart～end 的全部資料，前端篩選，避免月份迴圈邊界問題
  const cacheKey = `txns-range-${prevStart}-${end}`
  let data = useCache ? swr.get(cacheKey) : null
  if (!data) {
    const res = await api.getTransactions({ date_from: prevStart, date_to: end, limit: 1000 })
    if (!res.ok) return []
    data = res.data ?? []
    swr.set(cacheKey, data)
  }

  const txns = data.filter(t =>
    t.card === cardName &&
    !t.transfer_id && (
      // 當期：全部顯示（含延後入帳，讓使用者可取消）
      (t.date >= start && t.date <= end) ||
      // 上期延後入帳：帶入當期顯示
      (t.status === '延後入帳' && t.date >= prevStart && t.date < start)
    )
  )
  // 標記上期延後入帳的紀錄
  txns.forEach(t => {
    if (t.date < start && t.status === '延後入帳') t._fromPrevPeriod = true
  })
  txns.sort((a, b) => b.date.localeCompare(a.date) || b.created_at?.localeCompare(a.created_at ?? '') || 0)
  return txns
}

// ── 確認是否已繳款 ──
async function checkPaymentDone(cardName, periodEnd, useCache = false) {
  const cacheKey = `paydone-${cardName}-${periodEnd}`
  if (useCache) {
    const cached = swr.get(cacheKey)
    if (cached !== null) return cached
  }
  const d = new Date(periodEnd)
  d.setDate(d.getDate() + 60)
  const laterEnd = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  const res = await api.getTransactions({ date_from: periodEnd, date_to: laterEnd, card: cardName, limit: 100 })
  if (!res.ok) return false
  const done = (res.data ?? []).some(t => (t.name === '手動繳款' || t.name === '自動扣繳') && t.transfer_id)
  swr.set(cacheKey, done)
  return done
}

// router 於 app 啟動後在背景呼叫：預先把本頁資料放進 swr 快取（不碰 DOM）
export async function prefetch() {
  let accounts = swr.get('reconcile-accounts')
  if (!accounts) {
    const res = await api.getAssets()
    if (!res.ok) return
    accounts = res.data.accounts ?? []
    swr.set('reconcile-accounts', accounts)
  }
  const ccs = accounts.filter(a => a.type === '信用卡' && a.billing_day)
  await Promise.all(ccs.map(acc => {
    const month = calcDefaultCardMonth(acc.billing_day, acc.payment_day)
    const { end } = getBillingPeriod(acc.billing_day, month)
    return Promise.all([
      fetchBillingTxns(acc.name, acc.billing_day, month, true),
      checkPaymentDone(acc.name, end, true),
    ])
  }))
}

export default async function show({ signal }) {




let allAccounts = []
let recTxns = []       // 目前對帳 modal 裡的交易
let recCardAcc = null  // 目前對帳的信用卡 account 物件
let recSearchVal = ''
// 暫存所有本地狀態變更，key=id, value={ originalStatus, originalDate }
let pendingChanges = new Map()
// 相容舊邏輯（延後入帳需額外資訊）
let pendingDeferrals = new Map()

// 帳戶 view 狀態
let acctViewTxns = []
let _currentAcctViewId = ''
let _currentAcctViewName = ''
let _currentAcctViewMonth = ''

const WEEKDAYS = ['日','一','二','三','四','五','六']

function fmtDateHeader(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const w = WEEKDAYS[d.getDay()]
  return `${dateStr.replace(/-/g,'/')} 週${w}`
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

const ACCT_TYPE_LABEL = { '銀行': '銀行', '銀行存款': '銀行', '證券戶': '證券戶', '投資帳戶': '證券戶', '信用卡': '信用卡', '現金': '現金' }
function groupedAccountOptions(accounts) {
  const groups = {}
  for (const a of accounts) {
    const label = ACCT_TYPE_LABEL[a.type] ?? a.type
    if (!groups[label]) groups[label] = []
    groups[label].push(a)
  }
  const order = ['銀行', '證券戶', '現金']
  let html = ''
  for (const type of order) {
    if (!groups[type]?.length) continue
    html += `<optgroup label="${type}">`
    html += groups[type].map(a => `<option value="${escHtml(a.name)}">${escHtml(a.name)}</option>`).join('')
    html += '</optgroup>'
  }
  const knownTypes = new Set(order)
  const others = accounts.filter(a => !knownTypes.has(ACCT_TYPE_LABEL[a.type] ?? a.type))
  if (others.length) {
    html += `<optgroup label="其他">`
    html += others.map(a => `<option value="${escHtml(a.name)}">${escHtml(a.name)}</option>`).join('')
    html += '</optgroup>'
  }
  return html || '<option>無可用帳戶</option>'
}

// ── 帳戶 View 月份狀態（各帳戶共用同一個月份，開 modal 時獨立切換）──
const _nowMonth = (() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
})()
const _minAcctMonth = (() => {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - 23, 1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
})()
let acctViewMonth = _nowMonth

// ── 每張信用卡獨立的帳單期間狀態 ──
const cardMonths = {}

function getCardMonth(accId) {
  return cardMonths[accId] ?? null
}

const _nowStr = (() => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
})()

// 每張卡的最大可導覽月份：結算日已過 → 下個月；尚未到 → 本月
function getCardMaxMonth(billingDay) {
  const now = new Date()
  const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  const td = parseInt(todayStr.slice(8), 10)
  const ty = parseInt(todayStr.slice(0, 4), 10)
  const tm = parseInt(todayStr.slice(5, 7), 10)
  if (billingDay && td > billingDay) {
    const next = new Date(ty, tm, 1)
    return `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`
  }
  return `${ty}-${String(tm).padStart(2,'0')}`
}
const _minMonth = (() => {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - 23, 1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
})()

window.cardPeriodNav = async function(accId, dir) {
  const [y, m] = getCardMonth(accId).split('-').map(Number)
  const next = dir === 1 ? new Date(y, m, 1) : new Date(y, m - 2, 1)
  const val = `${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`
  const acc = allAccounts.find(a => a.id === accId)
  const maxMonth = acc ? getCardMaxMonth(acc.billing_day) : _nowStr
  if (val > maxMonth || val < _minMonth) return
  cardMonths[accId] = val
  if (!acc) return
  const el = document.getElementById('cc-card-' + accId)
  if (el) el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">載入中…</div>'
  const cardHtml = await buildCCCardHtml(acc)
  if (el) el.outerHTML = cardHtml
}

// ── 判斷對帳狀態 ──
function getBillingStatus(txns) {
  if (!txns.length) return null
  const decided = txns.filter(t => t.status !== '待確認')
  const confirmed = txns.filter(t => t.status === '已對帳')
  const allDecided = decided.length === txns.length
  const amount = confirmed.reduce((s, t) => t.type === '收入' ? s - t.amount : s + t.amount, 0)
  const totalExpense = txns.reduce((s, t) => t.type === '收入' ? s - t.amount : s + t.amount, 0)
  return { allDecided, confirmedCount: confirmed.length, total: txns.length, amount, totalExpense }
}

// ── 渲染全頁 ──
window.renderAll = renderAll  // header「重新整理」onclick 用
async function renderAll() {
  const cached = swr.get('reconcile-accounts')
  if (cached) {
    allAccounts = cached
    await renderCCSection(true)  // 快取直出（進頁秒開）
    renderAcctSection()
  }
  const [res, cRes] = await Promise.all([api.getAssets(), api.getCategories()])
  if (!res.ok) return
  allAccounts = res.data.accounts ?? []
  swr.set('reconcile-accounts', allAccounts)
  preloadTxnModalData(allAccounts, cRes.ok ? cRes.data : [])
  await renderCCSection()  // 網路資料校正
  renderAcctSection()
}

// ── 單張信用卡 HTML 建構 ──
async function buildCCCardHtml(acc, useCache = false) {
  // 首次顯示才計算預設期別，之後保留使用者手動切換的結果
  if (!cardMonths[acc.id]) {
    cardMonths[acc.id] = calcDefaultCardMonth(acc.billing_day, acc.payment_day)
  }
  const month = cardMonths[acc.id]
  const now = new Date()
  const [selY, selM] = month.split('-').map(Number)
  const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })

  function billingDateForMonth(day) {
    const t = new Date(selY, selM - 1, day)
    return { year: t.getFullYear(), month: t.getMonth() + 1, day, daysUntil: Math.ceil((t - now) / 86400000) }
  }
  function paymentDateForMonth(payDay, billDay) {
    const sameMonth = payDay > billDay
    const t = new Date(selY, sameMonth ? selM - 1 : selM, payDay)
    return { year: t.getFullYear(), month: t.getMonth() + 1, day: payDay, daysUntil: Math.ceil((t - now) / 86400000) }
  }
  function payColor(days) {
    if (days <= 1) return 'var(--danger)'
    if (days <= 3) return 'var(--warning)'
    if (days <= 5) return 'var(--success)'
    return 'var(--text-muted)'
  }

  let billingStatus = null, isPaid = false, periodEnd = null
  if (acc.billing_day) {
    const { start, end } = getBillingPeriod(acc.billing_day, month)
    periodEnd = end
    // 兩個 API call 並行，不互相等待
    const [txns, isPaidResult] = await Promise.all([
      fetchBillingTxns(acc.name, acc.billing_day, month, useCache),
      checkPaymentDone(acc.name, end, useCache),
    ])
    billingStatus = getBillingStatus(txns)
    isPaid = !!billingStatus && isPaidResult
  }

  // 判斷扣款日是否已過
  let paymentPast = false
  let payDateStr = null
  if (acc.payment_day && periodEnd) {
    const sameMonth = acc.payment_day > acc.billing_day
    const [ey, em] = periodEnd.split('-').map(Number)
    const payT = new Date(ey, sameMonth ? em - 1 : em, acc.payment_day)
    payDateStr = payT.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
    paymentPast = payDateStr < todayStr
  }

  // 對帳狀態
  let statusHtml = ''
  if (!acc.billing_day) {
    statusHtml = `<span style="color:var(--text-muted);font-size:12px">–</span>`
  } else if (periodEnd && periodEnd > todayStr) {
    // 結算日尚未到 → 顯示累計消費金額
    statusHtml = billingStatus?.totalExpense
      ? `<span style="color:var(--text-muted);font-size:13px;font-weight:600">NT$${billingStatus.totalExpense.toLocaleString()}</span>`
      : `<span style="color:var(--text-muted);font-size:12px">本期無消費</span>`
  } else if (!billingStatus) {
    // 結算日已過但無交易
    statusHtml = `<span style="color:var(--text-muted);font-size:12px">本期無消費</span>`
  } else if (isPaid) {
    statusHtml = `<span style="color:var(--accent);font-size:13px;font-weight:600">已繳款</span>`
  } else if (paymentPast) {
    // 有交易、扣款日已過、未繳
    statusHtml = `<span style="color:var(--danger);font-size:13px;font-weight:600">未繳款</span>`
  } else if (billingStatus.allDecided) {
    statusHtml = `<span style="color:var(--success);font-size:13px;font-weight:600">NT$${billingStatus.amount.toLocaleString()} 應繳</span>`
  } else {
    const totalStr = billingStatus.totalExpense ? ` · NT$${billingStatus.totalExpense.toLocaleString()}` : ''
    statusHtml = `<span style="color:var(--warning);font-size:13px">未對帳${totalStr}</span>`
  }

  // 帳單期間導覽列（每張卡獨立）
  let periodNav = ''
  if (acc.billing_day) {
    const { start, end } = getBillingPeriod(acc.billing_day, month)
    const shortFmt = s => s.slice(5).replace('-', '/')
    const canPrev = month > _minMonth
    const canNext = month < getCardMaxMonth(acc.billing_day)
    periodNav = `<div style="display:flex;align-items:center;justify-content:center;gap:10px;padding:8px 0 4px;border-bottom:1px solid var(--border);margin-bottom:8px">
      <button onclick="cardPeriodNav('${escHtml(acc.id)}',-1)" style="background:none;border:none;color:${canPrev ? 'var(--text)' : 'var(--border)'};font-size:18px;cursor:${canPrev ? 'pointer' : 'default'};padding:0 4px;line-height:1">‹</button>
      <span style="font-size:12px;color:var(--text-muted);min-width:120px;text-align:center">${shortFmt(start)} ～ ${shortFmt(end)}</span>
      <button onclick="cardPeriodNav('${escHtml(acc.id)}',1)" style="background:none;border:none;color:${canNext ? 'var(--text)' : 'var(--border)'};font-size:18px;cursor:${canNext ? 'pointer' : 'default'};padding:0 4px;line-height:1">›</button>
    </div>`
  }

  // 結算日列
  let billingRow = ''
  if (acc.billing_day) {
    const b = billingDateForMonth(acc.billing_day)
    const bLabel = b.daysUntil > 0 ? `（${b.daysUntil} 天後）` : b.daysUntil === 0 ? '（今天）' : ''
    billingRow = `<div class="cc-row">
      <span class="cc-row-label">結算日</span>
      <span>${b.year} 年 ${b.month} 月 ${b.day} 日${bLabel}</span>
    </div>`
  }

  // 扣款日列
  let paymentRow = ''
  if (acc.payment_day) {
    const p = paymentDateForMonth(acc.payment_day, acc.billing_day)
    const pLabel = p.daysUntil > 0 ? `（${p.daysUntil} 天後）` : p.daysUntil === 0 ? '（今天）' : ''
    paymentRow = `<div class="cc-row">
      <span class="cc-row-label">扣款日</span>
      <span style="color:${p.daysUntil >= 0 ? payColor(p.daysUntil) : 'var(--text-muted)'};font-weight:600">${p.year} 年 ${p.month} 月 ${p.day} 日${pLabel}</span>
    </div>`
  }

  if (!acc.billing_day && !acc.payment_day) {
    billingRow = `<div class="cc-row"><span class="cc-row-label" style="font-style:italic">尚未設定結算日 / 扣款日</span></div>`
  }

  return `<div class="cc-card" id="cc-card-${escHtml(acc.id)}">
    <div class="cc-card-header">
      <div class="cc-card-name">💳 ${escHtml(acc.name)}</div>
      <div>${statusHtml}</div>
    </div>
    ${periodNav}
    <div class="cc-card-rows">
      ${billingRow}${paymentRow}
    </div>
    ${acc.billing_day ? `<div class="cc-card-footer" style="display:flex;gap:8px;align-items:center">
      ${acc.payment_method === 'auto'
        ? `<span style="opacity:0.4;font-size:12px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;cursor:default">自動扣繳</span>`
        : isPaid
          ? `<span style="opacity:0.4;font-size:12px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;cursor:default">手動繳款</span>`
          : (periodEnd && periodEnd > todayStr)
            ? `<button class="btn btn-secondary btn-sm" style="opacity:0.4" onclick="paymentNotReady()">手動繳款</button>`
            : billingStatus?.allDecided
              ? `<button class="btn btn-primary btn-sm" onclick="openPaymentModal('${escHtml(acc.name)}',${billingStatus.amount})">手動繳款</button>`
              : `<button class="btn btn-secondary btn-sm" style="opacity:0.4" onclick="paymentNotReady()">手動繳款</button>`
      }
      ${(isPaid || !billingStatus)
        ? `<button class="btn btn-secondary btn-sm" style="opacity:0.4;cursor:default" disabled>開始對帳</button>`
        : `<button class="btn btn-secondary btn-sm" onclick="openRecModal('${escHtml(acc.id)}')">開始對帳</button>`
      }
    </div>` : ''}
  </div>`
}

// ── 信用卡區 ──
async function renderCCSection(useCache = false) {
  const ccAccs = allAccounts.filter(a => a.type === '信用卡')
  const container = document.getElementById('cc-section')
  if (!ccAccs.length) {
    container.innerHTML = '<div class="empty-state" style="padding:16px 0">無信用卡帳戶</div>'
    return
  }
  // 第一次才建立佔位；已有內容時直接更新，避免閃爍
  const hasExisting = ccAccs.every(acc => document.getElementById('cc-card-' + acc.id))
  if (!hasExisting) {
    container.innerHTML = ccAccs.map(acc =>
      `<div id="cc-card-${escHtml(acc.id)}" class="cc-card"><div style="padding:20px;text-align:center;color:var(--text-muted)">載入中…</div></div>`
    ).join('')
  }
  await Promise.all(ccAccs.map(async acc => {
    const html = await buildCCCardHtml(acc, useCache)
    const el = document.getElementById('cc-card-' + acc.id)
    if (el) el.outerHTML = html
  }))
}

// ── 帳戶記錄區 ──
function renderAcctSection() {
  const nonCC = allAccounts.filter(a => a.type !== '信用卡')
  const container = document.getElementById('acct-section')
  if (!nonCC.length) {
    container.innerHTML = '<div class="empty-state" style="padding:16px 0">無帳戶</div>'
    return
  }

  const iconMap = { '銀行':'🏦','銀行存款':'🏦','現金':'💵','證券戶':'📈','投資帳戶':'📈','信用卡':'💳' }
  const typeLabel = { '銀行':'銀行', '銀行存款':'銀行', '證券戶':'證券戶', '投資帳戶':'證券戶', '現金':'現金', '信用卡':'信用卡' }
  const typeOrder = ['銀行', '證券戶', '現金', '信用卡']

  // 依類型分組
  const groups = {}
  for (const acc of nonCC) {
    const label = typeLabel[acc.type] ?? acc.type
    if (!groups[label]) groups[label] = []
    groups[label].push(acc)
  }

  function renderRow(acc) {
    const icon = iconMap[acc.type] ?? '💼'
    const bal = acc.balance >= 0
      ? `<span style="color:var(--accent)">NT$${acc.balance.toLocaleString()}</span>`
      : `<span style="color:var(--danger)">NT$${Math.abs(acc.balance).toLocaleString()}</span>`
    return `<div class="acct-row" onclick="openAcctView('${escHtml(acc.id)}','${escHtml(acc.name)}')">
      <div class="acct-row-icon">${icon}</div>
      <div class="acct-row-info">
        <div class="acct-row-name">${escHtml(acc.name)}</div>
        <div class="acct-row-sub">${acc.type}</div>
      </div>
      <div class="acct-row-balance">${bal}</div>
      <div style="color:var(--text-muted);font-size:18px;margin-left:4px">›</div>
    </div>`
  }

  let html = ''
  const rendered = new Set()
  for (const type of typeOrder) {
    const accs = groups[type]
    if (!accs?.length) continue
    rendered.add(type)
    html += `<div style="padding:10px 16px 4px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">${type}</div>`
    html += accs.map(renderRow).join('')
  }
  // 其他未分類
  for (const [type, accs] of Object.entries(groups)) {
    if (rendered.has(type)) continue
    html += `<div style="padding:10px 16px 4px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">${type}</div>`
    html += accs.map(renderRow).join('')
  }

  container.innerHTML = html
}

// ── 對帳 Modal ──
window.openRecModal = async function(accId) {
  recCardAcc = allAccounts.find(a => a.id === accId)
  if (!recCardAcc) return
  const month = getCardMonth(accId)

  const { start, end } = getBillingPeriod(recCardAcc.billing_day, month)
  document.getElementById('rec-modal-card-name').textContent = recCardAcc.name
  document.getElementById('rec-modal-period').textContent = `${start} ～ ${end}`
  document.getElementById('rec-search').value = ''
  recSearchVal = ''
  document.getElementById('rec-modal').classList.add('open')
  document.body.style.overflow = 'hidden'
  document.getElementById('rec-modal-list').innerHTML = '<div style="padding:20px 0;color:var(--text-muted);text-align:center">載入中…</div>'

  pendingChanges.clear()
  pendingDeferrals.clear()
  recTxns = await fetchBillingTxns(recCardAcc.name, recCardAcc.billing_day, month)
  renderRecModal()
}

window.closeRecModal = async function() {
  const totalPending = pendingChanges.size + pendingDeferrals.size
  if (totalPending > 0) {
    const deferCount = pendingDeferrals.size
    const confirmCount = pendingChanges.size
    let msg = `有 ${totalPending} 筆未儲存的變更`
    if (deferCount > 0) msg += `（含 ${deferCount} 筆延後入帳將移至下期）`
    msg += '。\n\n確認儲存？'
    const ok = confirm(msg)
    if (ok) {
      await saveAllPending()
    } else {
      // 捨棄：還原所有本機暫存
      for (const [id, info] of pendingChanges) {
        const t = recTxns.find(x => x.id === id)
        if (t) { t.status = info.originalStatus; t.date = info.originalDate }
      }
      for (const [id, info] of pendingDeferrals) {
        const t = recTxns.find(x => x.id === id)
        if (t) t.status = info.originalStatus
      }
      pendingChanges.clear()
      pendingDeferrals.clear()
    }
  }
  document.getElementById('rec-modal').classList.remove('open')
  if (!document.getElementById('acct-view-modal').classList.contains('open')) {
    document.body.style.overflow = ''
  }
  // 退出時整頁同步更新：所有卡片金額 + 帳戶餘額（新增/更新/刪除都會反映）
  await renderAll()
}

async function saveAllPending() {
  // 批次儲存所有狀態變更
  const promises = []
  for (const [id] of pendingChanges) {
    const t = recTxns.find(x => x.id === id)
    if (!t) continue
    const body = { status: t.status }
    if (t.status === '待確認') {
      // 若 deferred_to 有記錄原始日期（上期延後入帳被確認後取消），一起還原
      body.deferred_to = null
      if (t.deferred_to) body.date = t.deferred_to
    }
    if (t._fromPrevPeriod && t.status === '已對帳') {
      const newDate = pendingChanges.get(id)?.newDate ?? t.date
      body.date = newDate
      body.deferred_to = t.date  // 保存原始日期，讓之後能還原
    }
    promises.push(api.updateTransaction(id, body))
  }
  for (const [id, info] of pendingDeferrals) {
    if (info.needsApi) promises.push(api.updateTransaction(id, { status: '延後入帳' }))
  }
  await Promise.all(promises)
  pendingChanges.clear()
  pendingDeferrals.clear()
  renderRecModal()
}

function renderRecModal() {
  // 淨額 = 支出 − 收入（折扣會減少帳單）
  const totalNet = recTxns.reduce((s, t) => t.type === '收入' ? s - t.amount : s + t.amount, 0)
  document.getElementById('rec-modal-card-total').textContent = totalNet ? `NT$${totalNet.toLocaleString()}` : 'NT$0'

  const decided = recTxns.filter(t => {
    if (t.status === '待確認') return false
    const isUntouched = t._fromPrevPeriod && t.status === '延後入帳'
      && !pendingDeferrals.has(t.id) && !pendingChanges.has(t.id)
    return !isUntouched
  })
  const confirmedNet = recTxns.filter(t => t.status === '已對帳').reduce((s,t) => t.type === '收入' ? s - t.amount : s + t.amount, 0)
  document.getElementById('rec-count').textContent = `${decided.length}/${recTxns.length}`
  const amtEl = document.getElementById('rec-amount')
  amtEl.textContent = 'NT$' + Math.abs(confirmedNet).toLocaleString()
  amtEl.style.color = confirmedNet > 0 ? 'var(--danger)' : confirmedNet < 0 ? 'var(--success)' : ''

  // 待儲存提示
  const totalPending = pendingChanges.size + pendingDeferrals.size
  const pendingEl = document.getElementById('rec-pending-hint')
  if (totalPending > 0) {
    pendingEl.textContent = `${totalPending} 筆待儲存`
    pendingEl.style.display = 'block'
  } else {
    pendingEl.style.display = 'none'
  }

  const filtered = recSearchVal
    ? recTxns.filter(t => (t.name + t.category).toLowerCase().includes(recSearchVal.toLowerCase()))
    : recTxns

  if (!filtered.length) {
    document.getElementById('rec-modal-list').innerHTML = '<div style="padding:20px 0;color:var(--text-muted);text-align:center">無符合記錄</div>'
    return
  }

  // 依日期分組
  const groups = {}
  for (const t of filtered) {
    if (!groups[t.date]) groups[t.date] = []
    groups[t.date].push(t)
  }

  let html = ''
  for (const date of Object.keys(groups).sort().reverse()) {
    html += `<div class="rec-date-header">${fmtDateHeader(date)}</div>`
    for (const t of groups[date]) {
      const isConfirmed = t.status === '已對帳'
      const isDeferred = t.status === '延後入帳'
      const isPrevPeriod = !!t._fromPrevPeriod
      const isIncome = t.type === '收入'

      // 金額顏色：一律依收支類型
      const amtColor = isIncome ? 'var(--success)' : 'var(--danger)'
      const amtDisplay = `NT$${t.amount.toLocaleString()}`

      const isPrevActedOn = isPrevPeriod && (isConfirmed || pendingDeferrals.has(t.id))
      const amtColorFinal = amtColor

      // 狀態標籤：上期延後入帳的備註接在後面
      let subText = ''
      if (isPrevPeriod) {
        let suffix = ''
        if (isConfirmed) suffix = ' · 已入帳'
        else if (pendingDeferrals.has(t.id)) suffix = ' · 延後至下期'
        subText = `<div class="rec-txn-sub" style="color:var(--warning)">上期延後入帳${suffix}</div>`
      } else if (isConfirmed) {
        subText = `<div class="rec-txn-sub">已入帳</div>`
      } else if (isDeferred) {
        subText = `<div class="rec-txn-sub">延後至下期</div>`
      }

      // 上期紀錄被操作後才顯示 decided 樣式（橫線＋淡化）
      const isDecided = (!isPrevPeriod && (isConfirmed || isDeferred)) || isPrevActedOn
      const rowClass = isDecided ? 'rec-txn-row decided' : 'rec-txn-row'
      const btnConfirmClass = (isConfirmed && !isPrevPeriod) || (isPrevPeriod && isConfirmed) ? 'rec-act active-confirm' : 'rec-act act-confirm'
      const btnDeferClass = (isDeferred && !isPrevPeriod) || (isPrevPeriod && pendingDeferrals.has(t.id)) ? 'rec-act active-defer' : 'rec-act act-defer'

      html += `<div class="${rowClass}" style="cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none" onclick="openEditRecTxn('${escHtml(t.id)}')">
        <div class="rec-txn-main">
          <div class="rec-txn-icon">${catIcon(t.category)}</div>
          <div class="rec-txn-info">
            <div class="rec-txn-name">${escHtml(t.name || t.category)}</div>
            ${subText}
          </div>
          <div class="rec-inline-actions">
            <button class="${btnDeferClass}" title="延後至下期" onclick="recSetStatus(event,'${escHtml(t.id)}','延後入帳',null)">↓</button>
            <button class="${btnConfirmClass}" title="已入帳" onclick="recSetStatus(event,'${escHtml(t.id)}','已對帳')">✓</button>
          </div>
          <div class="rec-txn-amount" style="color:${amtColorFinal}">${amtDisplay}</div>
        </div>
      </div>`
    }
  }
  document.getElementById('rec-modal-list').innerHTML = html
}

window.recSetStatus = async function(e, id, status) {
  e?.stopPropagation()
  const t = recTxns.find(x => x.id === id)
  if (!t) return

  // 取真正的原始狀態（DB 中）
  const savedOrig = pendingChanges.get(id) ?? pendingDeferrals.get(id)
  const trueOrigStatus = savedOrig?.originalStatus ?? t.status
  const trueOrigDate = savedOrig?.originalDate ?? t.date

  // 再按一次當前啟動的按鈕 → 一律取消回待確認
  if (status === t.status) {
    pendingChanges.delete(id)
    pendingDeferrals.delete(id)
    t.status = '待確認'
    t.date = trueOrigDate
    if (trueOrigStatus !== '待確認') {
      // DB 中不是待確認 → 需要記入待存清單，儲存時才會真的取消
      pendingChanges.set(id, { originalStatus: trueOrigStatus, originalDate: trueOrigDate })
    }
    renderRecModal()
    return
  }

  // 設定新狀態：先清掉舊的暫存，再記錄原始狀態
  pendingChanges.delete(id)
  pendingDeferrals.delete(id)

  if (status === '延後入帳') {
    pendingDeferrals.set(id, { originalStatus: trueOrigStatus, originalDate: trueOrigDate, needsApi: trueOrigStatus !== '延後入帳' })
  } else {
    pendingChanges.set(id, { originalStatus: trueOrigStatus, originalDate: trueOrigDate })
    if (t._fromPrevPeriod && status === '已對帳' && recCardAcc) {
      const { start } = getBillingPeriod(recCardAcc.billing_day, getCardMonth(recCardAcc.id))
      pendingChanges.get(id).newDate = start
    }
  }

  t.status = status
  renderRecModal()
}

window.filterRecTxns = function(val) {
  recSearchVal = val
  renderRecModal()
}

// ── 帳戶 View Modal ──
window.openAcctView = function(accId, accName) {
  _currentAcctViewId = accId
  _currentAcctViewName = accName
  acctViewMonth = _nowMonth
  document.getElementById('acct-view-title').textContent = accName
  const acctObj = allAccounts.find(a => a.id === accId)
  const balEl = document.getElementById('acct-view-balance')
  if (acctObj != null) {
    balEl.textContent = 'NT$' + Math.abs(acctObj.balance).toLocaleString()
    balEl.style.color = acctObj.balance >= 0 ? 'var(--accent)' : 'var(--danger)'
  } else {
    balEl.textContent = ''
  }
  document.getElementById('acct-view-modal').classList.add('open')
  document.body.style.overflow = 'hidden'
  loadAcctView()
}

window.acctMonthNav = function(dir) {
  const [y, m] = acctViewMonth.split('-').map(Number)
  const d = dir === 1 ? new Date(y, m, 1) : new Date(y, m - 2, 1)
  const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  if (val > _nowMonth || val < _minAcctMonth) return
  acctViewMonth = val
  loadAcctView()
}

async function loadAcctView() {
  const month = acctViewMonth
  const [y, m] = month.split('-').map(Number)
  document.getElementById('acct-month-display').textContent = `${y} 年 ${m} 月`
  document.getElementById('acct-month-prev').style.color = month > _minAcctMonth ? 'var(--text)' : 'var(--border)'
  document.getElementById('acct-month-next').style.color = month < _nowMonth ? 'var(--text)' : 'var(--border)'
  document.getElementById('acct-view-list').innerHTML = '<div style="padding:20px 0;color:var(--text-muted);text-align:center">載入中…</div>'

  const acctObj = allAccounts.find(a => a.id === _currentAcctViewId)
  const queryParams = acctObj?.id
    ? { month, account_id: acctObj.id, limit: 500 }
    : { month, card: _currentAcctViewName, limit: 500 }
  const res = await api.getTransactions(queryParams)
  if (!res.ok) {
    document.getElementById('acct-view-list').innerHTML = '<div style="padding:20px 0;color:var(--danger);text-align:center">載入失敗</div>'
    return
  }
  acctViewTxns = (res.data ?? []).sort((a, b) => b.date.localeCompare(a.date))

  if (!acctViewTxns.length) {
    document.getElementById('acct-view-list').innerHTML = '<div style="padding:20px 0;color:var(--text-muted);text-align:center">本月無記錄</div>'
    document.getElementById('acct-view-count').textContent = '0'
    const totalEl = document.getElementById('acct-view-total')
    totalEl.textContent = 'NT$0'
    totalEl.style.color = ''
    return
  }

  const incomeAmt = acctViewTxns.filter(t => t.type === '收入').reduce((s, t) => s + t.amount, 0)
  const expenseAmt = acctViewTxns.filter(t => t.type !== '收入').reduce((s, t) => s + t.amount, 0)
  const net = incomeAmt - expenseAmt
  const totalEl = document.getElementById('acct-view-total')
  totalEl.textContent = 'NT$' + Math.abs(net).toLocaleString()
  totalEl.style.color = net >= 0 ? 'var(--success)' : 'var(--danger)'
  document.getElementById('acct-view-count').textContent = acctViewTxns.length

  let html = ''
  let lastDate = ''
  for (const t of acctViewTxns) {
    if (t.date !== lastDate) {
      html += `<div style="font-size:11px;color:var(--text-muted);padding:10px 0 4px">${fmtDateHeader(t.date)}</div>`
      lastDate = t.date
    }
    const amtColor = t.type === '收入' ? 'var(--success)' : 'var(--danger)'
    html += `<div class="av-txn-row" style="cursor:pointer" onclick="openEditAcctTxn('${escHtml(t.id)}')">
      <div class="av-txn-icon">${catIcon(t.category)}</div>
      <div class="av-txn-info">
        <div class="av-txn-name">${escHtml(t.name || t.category)}</div>
        <div class="av-txn-sub">${escHtml(t.category)}</div>
      </div>
      <div class="av-txn-amt" style="color:${amtColor}">NT$${t.amount.toLocaleString()}</div>
    </div>`
  }
  document.getElementById('acct-view-list').innerHTML = html
}

window.closeAcctView = function() {
  document.getElementById('acct-view-modal').classList.remove('open')
  if (!document.getElementById('rec-modal').classList.contains('open')) {
    document.body.style.overflow = ''
  }
}

function _refreshAcctView() {
  if (_currentAcctViewId) loadAcctView()
}

window.openNewTxnForAcct = function() {
  if (window.innerWidth <= 768) { location.href = '/add.html'; return }
  openAddTxnModal({ prefillCard: _currentAcctViewName, onSave: _refreshAcctView })
}

window.openEditAcctTxn = function(id) {
  const t = acctViewTxns.find(x => x.id === id)
  if (!t) return
  openEditTxnModal(t, { onSave: _refreshAcctView })
}

window.openEditRecTxn = function(id) {
  const t = recTxns.find(x => x.id === id)
  if (!t) return
  openEditTxnModal(t, {
    onSave: async () => {
      pendingChanges.clear()
      pendingDeferrals.clear()
      recTxns = await fetchBillingTxns(recCardAcc.name, recCardAcc.billing_day, getCardMonth(recCardAcc.id))
      renderRecModal()
    }
  })
}

window.openNewTxnForCard = function() {
  const month = getCardMonth(recCardAcc.id)
  const { start, end } = getBillingPeriod(recCardAcc.billing_day, month)
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  // 今天在帳單週期內就用今天，否則用週期結束日（避免新增的紀錄撈不到）
  const prefillDate = (todayStr >= start && todayStr <= end) ? todayStr : end
  openAddTxnModal({
    prefillCard: recCardAcc?.name,
    prefillDate,
    onSave: async () => {
      recTxns = await fetchBillingTxns(recCardAcc.name, recCardAcc.billing_day, getCardMonth(recCardAcc.id))
      renderRecModal()
    }
  })
}

window.paymentNotReady = function() {
  toast('請先完成對帳後再進行繳款', 'error')
}

// ── 付款 Modal ──
window.openPaymentModal = async function(cardName, billedAmount) {
  const accs = allAccounts
  const nonCC = accs.filter(a => a.type !== '信用卡')
  const cc = accs.find(a => a.name === cardName)
  const fromSel = document.getElementById('pay-from-account')
  fromSel.innerHTML = groupedAccountOptions(nonCC)
  // 若信用卡有設定 payment_account，預選它
  if (cc?.payment_account) {
    const opt = [...fromSel.options].find(o => o.value === cc.payment_account)
    if (opt) fromSel.value = cc.payment_account
  }
  document.getElementById('pay-to-account-display').value = cardName
  document.getElementById('pay-to-account').value = cardName
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  document.getElementById('pay-amount').value = billedAmount ?? (cc ? Math.abs(cc.balance) : '')
  document.getElementById('pay-date').value = today
  document.getElementById('payment-modal').classList.add('open')
}
window.closePaymentModal = function() { document.getElementById('payment-modal').classList.remove('open') }
window.confirmPayment = async function() {
  const from_account = document.getElementById('pay-from-account').value
  const to_account = document.getElementById('pay-to-account').value
  const amount = parseInt(document.getElementById('pay-amount').value)
  const date = document.getElementById('pay-date').value
  if (!amount || !date) { toast('請填寫金額和日期', 'error'); return }
  if (from_account === to_account) { toast('帳戶不能相同', 'error'); return }
  const res = await api.addPayment({ from_account, to_account, amount, date })
  if (res.ok) {
    closePaymentModal()
    toast(`付款轉帳已建立：${from_account} → ${to_account} NT$${amount.toLocaleString()}`)
    renderAll()
  } else toast(res.error ?? '操作失敗', 'error')
}

// 桌面版點 backdrop 關閉
document.getElementById('rec-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('rec-modal')) closeRecModal()
})
document.getElementById('acct-view-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('acct-view-modal')) closeAcctView()
})


renderAll()
}
