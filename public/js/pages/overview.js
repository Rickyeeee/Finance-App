import { api, toast, formatMoney, fmtSigned, amtColor, formatDate, badgeHtml, catIcon, initAppName, swr, hideSplash } from '/js/api.js'
import { openEditTxnModal, openEditTransferModal } from '/js/txn-modal.js'

// 此模組由 build-spa 從 index.html 抽出，router 每次進入頁面時呼叫 show()
// trendChart 放模組層級：重新進入頁面時能 destroy 前一次的 Chart 實例
let trendChart = null
let dailySummaryTxns = []

// router 於 app 啟動後在背景呼叫：預先把本頁資料放進 swr 快取（不碰 DOM）
export async function prefetch() {
  if (swr.get('assets')) return
  const [a, h] = await Promise.all([api.getAssets(), api.getAssetHistory(12)])
  if (a.ok) swr.set('assets', a.data)
  if (h.ok) swr.set('asset-history', h.data)
}

export default async function show({ signal }) {



const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
let allAccounts = []
let allInvestments = []
let allCategories = []

function resolvedCatIcon(name) {
  const cat = allCategories.find(c => c.name === name)
  return (cat && cat.icon) ? cat.icon : catIcon(name)
}
function catCircleHtml(name, size = 36) {
  const icon = resolvedCatIcon(name)
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.5)}px;flex-shrink:0">${icon}</div>`
}
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

const TYPE_ICON = { '銀行': '🏦', '銀行存款': '🏦', '證券戶': '📈', '投資帳戶': '📈', '信用卡': '💳', '現金': '💵' }
const TYPE_LABEL = { '銀行': '銀行', '銀行存款': '銀行', '證券戶': '證券戶', '投資帳戶': '證券戶', '信用卡': '信用卡', '現金': '現金' }
const TYPE_ORDER = ['銀行', '銀行存款', '證券戶', '投資帳戶', '信用卡', '現金']

// 扣款帳戶選單：依類別分組（跟對帳頁手動繳款選單一致），value 用 id
// 跨類別同名帳戶（如銀行「國泰」+證券戶「國泰」）才不會選錯
function groupedAccountOptions(accounts, selectedId = '') {
  const groups = {}
  for (const a of accounts) {
    const label = TYPE_LABEL[a.type] ?? a.type
    ;(groups[label] = groups[label] ?? []).push(a)
  }
  const order = ['銀行', '證券戶', '現金']
  let html = `<option value="">－ 未設定 －</option>`
  for (const type of order) {
    if (!groups[type]?.length) continue
    html += `<optgroup label="${type}">`
    html += groups[type].map(a => `<option value="${escHtml(a.id)}"${a.id === selectedId ? ' selected' : ''}>${escHtml(a.name)}</option>`).join('')
    html += '</optgroup>'
  }
  const known = new Set(order)
  const others = accounts.filter(a => !known.has(TYPE_LABEL[a.type] ?? a.type))
  if (others.length) {
    html += `<optgroup label="其他">`
    html += others.map(a => `<option value="${escHtml(a.id)}"${a.id === selectedId ? ' selected' : ''}>${escHtml(a.name)}</option>`).join('')
    html += '</optgroup>'
  }
  return html
}

function applyAssetsData(d, historyData) {
  allAccounts = d.accounts ?? []
  allInvestments = d.investments ?? []

  document.getElementById('total-net-worth').textContent = formatMoney(d.total_net_worth)
  document.getElementById('total-investments').textContent = formatMoney(d.total_investments)

  const mInc = document.getElementById('monthly-income')
  mInc.textContent = d.monthly_income > 0 ? '$' + d.monthly_income.toLocaleString() : '$0'
  mInc.style.color = d.monthly_income > 0 ? 'var(--success)' : 'var(--text)'

  const mExp = document.getElementById('monthly-expense')
  mExp.textContent = d.monthly_expense > 0 ? '$' + d.monthly_expense.toLocaleString() : '$0'
  mExp.style.color = d.monthly_expense > 0 ? 'var(--danger)' : 'var(--text)'

  const net = (d.monthly_income ?? 0) - (d.monthly_expense ?? 0)
  const incomeSub = document.getElementById('income-sub')
  const expenseSub = document.getElementById('expense-sub')
  if (net > 0) {
    incomeSub.textContent = `本月盈餘 $${net.toLocaleString()}`
    incomeSub.style.color = 'var(--success)'
    expenseSub.textContent = '本月消費'
    expenseSub.style.color = ''
  } else if (net < 0) {
    expenseSub.textContent = `本月虧損 $${Math.abs(net).toLocaleString()}`
    expenseSub.style.color = 'var(--danger)'
    incomeSub.textContent = '本月收入'
    incomeSub.style.color = ''
  } else {
    incomeSub.textContent = '本月收入'
    incomeSub.style.color = ''
    expenseSub.textContent = '本月消費'
    expenseSub.style.color = ''
  }

  const pnl = d.investment_pnl
  const pnlEl = document.getElementById('investment-pnl')
  pnlEl.textContent = formatMoney(pnl) + ' 損益'
  pnlEl.style.color = pnl >= 0 ? 'var(--success)' : 'var(--danger)'

  if (d.total_credit_used > 0) {
    document.getElementById('net-worth-sub').textContent = `信用卡負債 ${formatMoney(d.total_credit_used)}`
    document.getElementById('net-worth-sub').style.color = 'var(--danger)'
  }

  renderAccounts()
  if (historyData) renderTrendChart(historyData, d.total_net_worth ?? 0)
}

window.load = load  // header「重新整理」onclick 用

async function load() {
  // 快取先渲染
  const cachedAssets = swr.get('assets')
  const cachedHistory = swr.get('asset-history')
  if (cachedAssets) {
    applyAssetsData(cachedAssets, cachedHistory ?? [])
    renderCountdowns()
    loadDailySummary()
  }

  // 背景拉新資料
  const [assetsRes, historyRes, catsRes] = await Promise.all([
    api.getAssets(),
    api.getAssetHistory(12),
    api.getCategories(),
  ])
  if (catsRes.ok) allCategories = catsRes.data
  if (!assetsRes.ok) return

  swr.set('assets', assetsRes.data)
  if (historyRes.ok) swr.set('asset-history', historyRes.data)

  applyAssetsData(assetsRes.data, historyRes.data ?? [])
  if (!cachedAssets) {
    renderCountdowns()
    loadDailySummary()
  }
}

function renderAccounts() {
  const container = document.getElementById('accounts-list')

  // 依類別分組
  const groups = {}
  for (const acc of allAccounts) {
    const label = TYPE_LABEL[acc.type] ?? acc.type
    if (!groups[label]) groups[label] = []
    groups[label].push(acc)
  }

  // 證券戶特殊處理：顯示投資市值
  const invByAccount = {}
  for (const inv of allInvestments) {
    if (!invByAccount[inv.account]) invByAccount[inv.account] = 0
    invByAccount[inv.account] += inv.market_value
  }

  const order = ['銀行', '證券戶', '信用卡', '現金']
  let html = ''

  for (const type of order) {
    const accs = groups[type]
    if (!accs?.length) continue

    const included = accs.filter(a => (a.include_in_total ?? 1) !== 0)
    const groupTotal = included.reduce((s, a) => s + (type === '證券戶' ? (invByAccount[a.name] ?? a.balance) : a.balance), 0)
    const groupTotalDisplay = groupTotal < 0
      ? `<span style="color:var(--danger)">-${formatMoney(groupTotal)}</span>`
      : `<span style="color:var(--accent)">${formatMoney(groupTotal)}</span>`
    html += `<div class="account-group">
      <div class="account-group-title">
        <span>${TYPE_ICON[type] ?? ''} ${type}</span>
        ${groupTotalDisplay}
      </div>`

    for (const acc of accs) {
      const displayBalance = (type === '證券戶') ? (invByAccount[acc.name] ?? acc.balance) : acc.balance
      const balanceColor = displayBalance < 0 ? 'var(--danger)' : 'var(--accent)'
      const balanceSign = displayBalance < 0 ? '-' : ''
      const excluded = (acc.include_in_total ?? 1) === 0
      html += `<div class="account-row" style="${excluded ? 'opacity:0.5' : ''}" onclick="openEditModal('${acc.id}','${escJs(acc.name)}',${acc.balance},'${acc.type}',${acc.include_in_total ?? 1},${acc.billing_day ?? 'null'},${acc.payment_day ?? 'null'},${acc.credit_limit ?? 0},'${acc.payment_method ?? 'manual'}','${escJs(acc.payment_account_id ?? '')}')">
        <div style="flex:1;min-width:0">
          <div style="font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${escHtml(acc.name)}
            ${excluded ? '<span style="font-size:10px;color:var(--warning);margin-left:4px;vertical-align:middle">不計入</span>' : ''}
          </div>
          ${acc.bank ? `<div class="text-muted text-small">${escHtml(acc.bank)}</div>` : ''}
          ${type === '信用卡' && acc.credit_limit ? `<div class="text-muted text-small">可用 $${(acc.credit_limit + acc.balance).toLocaleString()} / ${acc.credit_limit.toLocaleString()}（${Math.max(0, Math.round((acc.credit_limit + acc.balance) / acc.credit_limit * 100))}%）</div>` : ''}
        </div>
        <div style="font-weight:600;color:${balanceColor};white-space:nowrap;text-align:right">${balanceSign}${formatMoney(displayBalance)}</div>
      </div>`
    }

    html += '</div>'
  }

  if (!html) {
    html = '<div class="empty-state">尚無帳戶<p>點擊「新增帳戶」開始設定</p></div>'
  }

  container.innerHTML = html
}

function renderTrendChart(history, liveTotalAssets) {
  const ctx = document.getElementById('trendChart').getContext('2d')
  if (trendChart) trendChart.destroy()

  // 建立快照索引（以 YYYY-MM 為 key）
  const snapMap = {}
  for (const h of history) snapMap[h.snapshot_date.slice(0, 7)] = h.total_assets

  // 產生近 12 個月的完整月份格子
  const nowTaipei = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const labels = [], values = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(nowTaipei)
    d.setUTCMonth(d.getUTCMonth() - i)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`
    const label = `${d.getUTCFullYear()}/${String(d.getUTCMonth()+1).padStart(2,'0')}`
    labels.push(label)
    values.push(snapMap[key] ?? null)
  }

  // 今天的即時資產永遠補在最右邊（覆蓋本月）
  values[values.length - 1] = liveTotalAssets

  // 用前一個已知值填補空白（carry forward）
  // isCarried：標記哪些點是「猜的」（當月沒有快照，借用前一筆），圖表用虛線畫這段
  const isCarried = new Array(values.length).fill(false)
  let _last = null
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null) _last = values[i]
    else if (_last !== null) { values[i] = _last; isCarried[i] = true }
  }

  if (values.every(v => v === null)) {
    ctx.canvas.parentElement.innerHTML = '<div class="empty-state">尚無歷史資料<p>系統每日午夜自動記錄，或手動點「快照」</p></div>'
    return
  }

  const carriedColor = 'rgba(139,148,158,0.55)'

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '總資產',
        data: values,
        borderColor: '#58a6ff',
        backgroundColor: 'rgba(88,166,255,0.1)',
        fill: true, tension: 0.3, pointRadius: (c) => c.raw !== null && !isCarried[c.dataIndex] ? 3 : 0, pointHoverRadius: 5,
        spanGaps: false,
        segment: {
          borderDash: sctx => (isCarried[sctx.p0DataIndex] || isCarried[sctx.p1DataIndex]) ? [5, 4] : undefined,
          borderColor: sctx => (isCarried[sctx.p0DataIndex] || isCarried[sctx.p1DataIndex]) ? carriedColor : undefined,
        },
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => {
          if (ctx.raw == null) return '無資料'
          const val = '$' + ctx.raw.toLocaleString()
          return isCarried[ctx.dataIndex] ? val + '（無快照，沿用前一筆）' : val
        } }
      }},
      scales: {
        x: { grid: { color: '#30363d' }, ticks: { color: '#8b949e', font: { size: 11 } } },
        y: { grid: { color: '#30363d' }, ticks: { color: '#8b949e', font: { size: 11 },
          callback: (v, i, ticks) => wLabel(v, ticks) } }
      },
      interaction: { mode: 'index', intersect: false },
    }
  })
}

// Y 軸標籤：範圍小於 5 萬時用小數，避免整數萬四捨五入後格線標籤重複（如連續三個都顯示「25W」）
function wLabel(v, ticks) {
  const range = Math.abs((ticks.at(-1)?.value ?? v) - (ticks[0]?.value ?? v))
  if (Math.abs(v) < 10000) return '$' + v.toLocaleString()
  const decimals = range < 50000 ? 1 : 0
  return '$' + (v / 10000).toFixed(decimals) + 'W'
}

async function renderCountdowns() {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()

  function nextDate(day) {
    let t = new Date(y, m, day)
    const tStr = t.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
    if (tStr < today) t = new Date(y, m + 1, day)
    const daysUntil = Math.ceil((t - now) / 86400000)
    return { month: t.getMonth() + 1, day, daysUntil }
  }

  // 查詢某信用卡的帳單期間交易（含上期延後入帳），判斷是否已對帳 + 總金額
  async function getBillingStatus(accName, billingDay) {
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

    // 取最近一個「已過」的結算日
    let periodEnd = new Date(y, m, billingDay)
    if (periodEnd > now) periodEnd = new Date(y, m - 1, billingDay)
    if (periodEnd > now) return null  // 結算日還沒到過

    // 當期起始 = 上個結算日的隔天
    const periodStart = new Date(periodEnd)
    periodStart.setMonth(periodStart.getMonth() - 1)
    periodStart.setDate(billingDay + 1)

    // 上期起始（用來撈延後入帳）
    const prevStart = new Date(periodStart)
    prevStart.setMonth(prevStart.getMonth() - 1)

    const startStr = fmt(periodStart)
    const endStr = fmt(periodEnd)
    const prevStartStr = fmt(prevStart)

    const res = await api.getTransactions({ date_from: prevStartStr, date_to: endStr, limit: 5000 })
    if (!res.ok) return null

    const txns = (res.data ?? []).filter(t =>
      t.card === accName && !t.transfer_id && t.type !== '收入' && (
        (t.date >= startStr && t.date <= endStr && t.status !== '延後入帳') ||
        (t.status === '延後入帳' && t.date >= prevStartStr && t.date < startStr)
      )
    )

    if (!txns.length) return { noTxns: true, endStr }
    const reconciled = txns.every(t => t.status !== '待確認')
    const amount = txns.filter(t => t.status === '已對帳').reduce((s, t) => s + t.amount, 0)
    return { reconciled, amount, endStr }
  }

  async function checkPaymentDone(cardName, periodEnd) {
    const d = new Date(periodEnd)
    d.setDate(d.getDate() + 60)
    const laterEnd = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
    const res = await api.getTransactions({ date_from: periodEnd, date_to: laterEnd, card: cardName, limit: 100 })
    if (!res.ok) return false
    return (res.data ?? []).some(t => (t.name === '手動繳款' || t.name === '自動扣繳') && t.transfer_id)
  }

  const ccAccounts = allAccounts.filter(a => a.type === '信用卡')

  if (!ccAccounts.length) {
    document.getElementById('upcoming-bills').innerHTML = '<div class="empty-state" style="padding:12px 0">無信用卡帳戶</div>'
    return
  }

  function paymentColor(days) {
    if (days <= 1) return 'var(--danger)'
    if (days <= 3) return 'var(--warning)'
    if (days <= 5) return 'var(--success)'
    return 'var(--text-muted)'
  }

  // 根據結算日結果計算實際扣款日期字串
  function calcPaymentDateStr(periodEndStr, billingDay, paymentDay) {
    const [ey, em, ed] = periodEndStr.split('-').map(Number)
    // payment_day > billing_day → 同月；否則 → 下個月
    const sameMonth = paymentDay > billingDay
    const t = new Date(ey, sameMonth ? em - 1 : em, paymentDay)
    return t.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  }

  let html = ''
  for (const acc of ccAccounts) {
    // 對帳狀態
    const status = acc.billing_day ? await getBillingStatus(acc.name, acc.billing_day) : null
    const isPaid = (status && !status.noTxns) ? await checkPaymentDone(acc.name, status.endStr) : false

    // 判斷扣款日是否已過
    let paymentPast = false
    if (status && acc.payment_day) {
      const payDateStr = calcPaymentDateStr(status.endStr, acc.billing_day, acc.payment_day)
      paymentPast = payDateStr < today
    }

    // 扣款日已過且已繳款或無消費 → 回到空窗期，顯示 –
    const backToIdle = paymentPast && (isPaid || status?.noTxns)

    let statusHtml = ''
    if (status === null || backToIdle) {
      statusHtml = `<span style="color:var(--text-muted);font-size:12px">–</span>`
    } else if (status.noTxns) {
      statusHtml = `<span style="color:var(--text-muted);font-size:12px">本期無消費</span>`
    } else if (isPaid) {
      statusHtml = `<span style="color:var(--success);font-size:13px;font-weight:600">已繳款</span>`
    } else if (paymentPast) {
      statusHtml = `<span style="color:var(--danger);font-size:13px;font-weight:600">未繳款</span>`
    } else if (status.reconciled) {
      statusHtml = `<span style="color:var(--success);font-size:13px;font-weight:600">$${status.amount.toLocaleString()} 應繳</span>`
    } else {
      statusHtml = `<span style="color:var(--warning);font-size:13px">未對帳</span>`
    }

    // 結算日列
    let billingRow = ''
    if (acc.billing_day) {
      if (status !== null && !backToIdle) {
        // 當期結算日已過 → 顯示當期日期 + 已結算
        const [ey, em, ed] = status.endStr.split('-').map(Number)
        billingRow = `<div class="bill-sub-row">
          <span class="bill-sub-label">結算日</span>
          <span>${em} 月 ${ed} 日</span>
          <span style="flex:1"></span>
          <span style="color:var(--text-muted);font-size:11px">已結算</span>
        </div>`
      } else {
        // 結算日還沒到（或空窗期等下期）→ 顯示即將到來的結算日
        const b = nextDate(acc.billing_day)
        billingRow = `<div class="bill-sub-row">
          <span class="bill-sub-label">結算日</span>
          <span>${b.month} 月 ${b.day} 日</span>
          <span style="flex:1"></span>
          <span style="color:var(--text-muted)">${b.daysUntil} 天後</span>
        </div>`
      }
    }

    // 扣款日列（有顏色）
    let paymentRow = ''
    if (acc.payment_day) {
      let payDateStr = null
      if (status !== null && !backToIdle) {
        // 從當期結算日推算扣款日
        payDateStr = calcPaymentDateStr(status.endStr, acc.billing_day, acc.payment_day)
      } else {
        // 結算日還沒到 → 從下一個結算日推算扣款日
        const b = nextDate(acc.billing_day)
        const fakeEnd = `${y + (b.month === 1 && m === 12 ? 1 : 0)}-${String(b.month).padStart(2,'0')}-${String(b.day).padStart(2,'0')}`
        payDateStr = calcPaymentDateStr(fakeEnd, acc.billing_day, acc.payment_day)
      }
      if (payDateStr) {
        const payD = new Date(payDateStr + 'T00:00:00')
        const daysUntil = Math.ceil((payD - now) / 86400000)
        const col = paymentColor(daysUntil)
        const [, pm, pd] = payDateStr.split('-').map(Number)
        const label = daysUntil > 0 ? `${daysUntil} 天後` : daysUntil === 0 ? '今天' : `${Math.abs(daysUntil)} 天前`
        paymentRow = `<div class="bill-sub-row">
          <span class="bill-sub-label">扣款日</span>
          <span>${pm} 月 ${pd} 日</span>
          <span style="flex:1"></span>
          <span style="color:${daysUntil >= 0 ? col : 'var(--text-muted)'};font-weight:600">${label}</span>
        </div>`
      }
    }

    if (!acc.billing_day && !acc.payment_day) {
      billingRow = `<div class="bill-sub-row"><span class="text-muted text-small">尚未設定結算日 / 扣款日</span></div>`
    }

    html += `<div class="bill-card">
      <div class="bill-card-header">
        <div style="font-weight:600">💳 ${acc.name}</div>
        <div>${statusHtml}</div>
      </div>
      ${billingRow}${paymentRow}
    </div>`
  }

  document.getElementById('upcoming-bills').innerHTML = html
}

function mergeTransferPairs(txns) {
  const result = []
  const seen = new Set()
  for (const t of txns) {
    if (t.transfer_id) {
      if (seen.has(t.transfer_id)) continue
      seen.add(t.transfer_id)
      const out = txns.find(x => x.transfer_id === t.transfer_id && x.type === '支出') || t
      const inc = txns.find(x => x.transfer_id === t.transfer_id && x.type === '收入') || t
      result.push({ ...out, _isMergedTransfer: true, _xfrFrom: out.card, _xfrTo: inc.card })
    } else {
      result.push(t)
    }
  }
  return result
}

async function loadDailySummary() {
  const el = document.getElementById('daily-summary')
  const month = today.slice(0, 7)
  const res = await api.getTransactions({ month, limit: 500 })
  if (!res.ok) { el.innerHTML = '<div class="text-muted" style="font-size:13px">載入失敗</div>'; return }
  const txns = res.data.filter(t => t.date === today)
  dailySummaryTxns = txns
  if (!txns.length) { el.innerHTML = '<div class="empty-state" style="padding:16px 0">今日無消費記錄</div>'; return }

  const realTxns = txns.filter(t => !t.transfer_id)
  const expTotal = realTxns.filter(t => t.type !== '收入').reduce((s,t) => s+t.amount, 0)
  const incTotal = realTxns.filter(t => t.type === '收入').reduce((s,t) => s+t.amount, 0)

  let html = mergeTransferPairs(txns).map(t => {
    if (t._isMergedTransfer) {
      const icon = `<div style="width:36px;height:36px;border-radius:50%;background:rgba(208,112,48,0.15);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">↔</div>`
      return `<div class="txn-row" onclick="window.__ovEditTransfer('${t.transfer_id}')">
        ${icon}
        <div class="txn-info">
          <div class="txn-name">${escHtml(t.note || '轉帳')}</div>
          <div class="txn-meta">${escHtml(t._xfrFrom)} → ${escHtml(t._xfrTo)}</div>
        </div>
        <div class="txn-right">
          <span class="txn-amt" style="color:#d07030">$${t.amount.toLocaleString()}</span>
        </div>
      </div>`
    }
    const recBadge = t.source === '定期' ? ' <span style="font-size:12px">🔁</span>' : ''
    return `<div class="txn-row" onclick="window.__ovEditTxn('${t.id}')">
      ${catCircleHtml(t.category, 36)}
      <div class="txn-info">
        <div class="txn-name">${escHtml(t.name || t.category)}${recBadge}</div>
        <div class="txn-meta">${t.card ? escHtml(t.card) : ''}</div>
      </div>
      <div class="txn-right">
        <span class="txn-amt ${t.type==='收入'?'amt-inc':'amt-exp'}">${fmtSigned(t.amount,t.type)}</span>
      </div>
    </div>`
  }).join('')

  const parts = []
  if (incTotal > 0) parts.push(`收入 <b style="color:#3fb950">$${incTotal.toLocaleString()}</b>`)
  if (expTotal > 0) parts.push(`支出 <b style="color:var(--danger)">$${expTotal.toLocaleString()}</b>`)
  if (parts.length) html += `<div style="padding:6px 0 0;font-size:12px;color:var(--text-muted);display:flex;justify-content:flex-end;gap:14px">${parts.join('')}</div>`
  el.innerHTML = html
}

window.__ovEditTxn = function(id) {
  const t = dailySummaryTxns.find(x => x.id === id)
  if (!t) return
  // 用 load() 而非 loadDailySummary()：改金額可能連動帳戶餘額/淨資產，兩個都要重新抓
  openEditTxnModal(t, { onSave: load })
}

window.__ovEditTransfer = function(transferId) {
  const out = dailySummaryTxns.find(x => x.transfer_id === transferId && x.type === '支出')
  const inc = dailySummaryTxns.find(x => x.transfer_id === transferId && x.type === '收入')
  if (!out || !inc) { toast('找不到轉帳記錄', 'error'); return }
  openEditTransferModal(out, inc, { onSave: load })
}

// --- 帳戶操作 ---

window.openAddAccountModal = function() {
  document.getElementById('acc-name').value = ''
  document.getElementById('acc-type').value = '銀行'
  document.getElementById('acc-balance').value = '0'
  document.getElementById('acc-billing-day').value = ''
  document.getElementById('acc-payment-day').value = ''
  document.getElementById('acc-credit-limit').value = ''
  document.getElementById('acc-payment-method').value = 'manual'
  document.getElementById('acc-payment-account-group').style.display = 'none'
  // 扣款帳戶只限銀行帳戶（現金、證券戶不適合當扣款來源）
  const bankOnly = allAccounts.filter(a => a.type === '銀行' || a.type === '銀行存款')
  document.getElementById('acc-payment-account').innerHTML = groupedAccountOptions(bankOnly)
  document.getElementById('acc-cc-fields').style.display = 'none'
  document.getElementById('add-account-modal').classList.add('open')
}

document.getElementById('acc-type').addEventListener('change', function() {
  document.getElementById('acc-cc-fields').style.display = this.value === '信用卡' ? 'block' : 'none'
})

window.closeAccountModal = function() {
  document.getElementById('add-account-modal').classList.remove('open')
}

window.addAccount = async function() {
  const name = document.getElementById('acc-name').value.trim()
  const type = document.getElementById('acc-type').value
  let balance = parseInt(document.getElementById('acc-balance').value) || 0
  if (type === '信用卡' && balance > 0) balance = -balance
  const include_in_total = document.getElementById('acc-include').checked ? 1 : 0
  const billing_day = type === '信用卡' ? (parseInt(document.getElementById('acc-billing-day').value) || null) : null
  const payment_day = type === '信用卡' ? (parseInt(document.getElementById('acc-payment-day').value) || null) : null
  const credit_limit = type === '信用卡' ? (parseInt(document.getElementById('acc-credit-limit').value) || null) : null
  const payment_method = type === '信用卡' ? document.getElementById('acc-payment-method').value : null
  const payment_account_id = type === '信用卡' ? (document.getElementById('acc-payment-account').value || null) : null
  const payment_account = payment_account_id ? (allAccounts.find(a => a.id === payment_account_id)?.name ?? null) : null

  if (!name) { toast('請輸入帳戶名稱', 'error'); return }
  if (billing_day !== null && (billing_day < 1 || billing_day > 31)) { toast('結算日請輸入 1-31', 'error'); return }
  if (payment_day !== null && (payment_day < 1 || payment_day > 31)) { toast('扣款日請輸入 1-31', 'error'); return }

  const res = await api.addAsset({ name, type, balance, include_in_total, billing_day, payment_day, credit_limit, payment_method, payment_account, payment_account_id })
  if (res.ok) {
    closeAccountModal()
    toast(`已新增「${name}」`)
    load()
  } else {
    toast(res.error ?? '新增失敗', 'error')
  }
}

window.openEditModal = function(id, name, balance, type, includeInTotal, billingDay, paymentDay, creditLimit, paymentMethod, paymentAccountId) {
  document.getElementById('edit-acc-id').value = id
  document.getElementById('edit-acc-orig-balance').value = balance
  document.getElementById('edit-acc-name-input').value = name
  document.getElementById('edit-acc-type').value = type ?? '銀行'
  document.getElementById('edit-acc-balance').value = balance
  document.getElementById('edit-acc-include').checked = includeInTotal !== 0
  document.getElementById('adjustment-preview').style.display = 'none'
  const isCC = (type === '信用卡')
  document.getElementById('edit-cc-fields').style.display = isCC ? 'block' : 'none'
  document.getElementById('edit-acc-billing-day').value = billingDay ?? ''
  document.getElementById('edit-acc-payment-day').value = paymentDay ?? ''
  document.getElementById('edit-acc-credit-limit').value = creditLimit ?? ''
  document.getElementById('edit-acc-payment-method').value = paymentMethod ?? 'manual'
  // 填入扣款帳戶選項：只限銀行帳戶（現金、證券戶不適合當扣款來源）
  const bankOnly = allAccounts.filter(a => a.type === '銀行' || a.type === '銀行存款')
  document.getElementById('edit-acc-payment-account').innerHTML = groupedAccountOptions(bankOnly, paymentAccountId || '')
  document.getElementById('edit-payment-account-group').style.display = (paymentMethod === 'auto') ? 'block' : 'none'
  previewInclude()
  document.getElementById('edit-balance-modal').classList.add('open')
}

window.togglePaymentAccount = function() {
  const isAuto = document.getElementById('edit-acc-payment-method').value === 'auto'
  document.getElementById('edit-payment-account-group').style.display = isAuto ? 'block' : 'none'
}

window.toggleAddPaymentAccount = function() {
  const isAuto = document.getElementById('acc-payment-method').value === 'auto'
  document.getElementById('acc-payment-account-group').style.display = isAuto ? 'block' : 'none'
}

document.getElementById('edit-acc-type').addEventListener('change', function() {
  document.getElementById('edit-cc-fields').style.display = this.value === '信用卡' ? 'block' : 'none'
})

window.closeEditModal = function() {
  document.getElementById('edit-balance-modal').classList.remove('open')
}

window.previewAdjustment = function() {
  const orig = parseInt(document.getElementById('edit-acc-orig-balance').value) || 0
  const newVal = parseInt(document.getElementById('edit-acc-balance').value)
  const preview = document.getElementById('adjustment-preview')
  if (isNaN(newVal) || newVal === orig) { preview.style.display = 'none'; return }
  const diff = newVal - orig
  preview.style.display = 'block'
  preview.innerHTML = `餘額調整：<strong style="color:${diff >= 0 ? 'var(--success)' : 'var(--danger)'}">$${Math.abs(diff).toLocaleString()}</strong>`
}

window.previewInclude = function() {
  const checked = document.getElementById('edit-acc-include').checked
  document.getElementById('include-hint').textContent = checked
    ? '此帳戶餘額納入總資產淨值計算'
    : '⚠️ 此帳戶不計入總資產淨值（僅供追蹤）'
  document.getElementById('include-hint').style.color = checked ? 'var(--text-muted)' : 'var(--warning)'
}

window.saveBalance = async function() {
  const id = document.getElementById('edit-acc-id').value
  const name = document.getElementById('edit-acc-name-input').value.trim()
  const type = document.getElementById('edit-acc-type').value
  let balance = parseInt(document.getElementById('edit-acc-balance').value)
  const include_in_total = document.getElementById('edit-acc-include').checked ? 1 : 0
  const billing_day = type === '信用卡' ? (parseInt(document.getElementById('edit-acc-billing-day').value) || null) : null
  const payment_day = type === '信用卡' ? (parseInt(document.getElementById('edit-acc-payment-day').value) || null) : null
  const credit_limit = type === '信用卡' ? (parseInt(document.getElementById('edit-acc-credit-limit').value) || null) : null
  const payment_method = type === '信用卡' ? document.getElementById('edit-acc-payment-method').value : null
  const payment_account_id = type === '信用卡' ? (document.getElementById('edit-acc-payment-account').value || null) : null
  const payment_account = payment_account_id ? (allAccounts.find(a => a.id === payment_account_id)?.name ?? null) : null

  if (!name) { toast('請輸入帳戶名稱', 'error'); return }
  if (isNaN(balance)) { toast('請輸入有效金額', 'error'); return }
  if (billing_day !== null && (billing_day < 1 || billing_day > 31)) { toast('結算日請輸入 1-31', 'error'); return }
  if (payment_day !== null && (payment_day < 1 || payment_day > 31)) { toast('扣款日請輸入 1-31', 'error'); return }
  if (type === '信用卡' && balance > 0) balance = -balance

  const res = await api.updateAsset(id, { name, type, balance, include_in_total, billing_day, payment_day, credit_limit, payment_method, payment_account, payment_account_id })
  if (res.ok) {
    closeEditModal()
    toast('已更新')
    load()
  } else {
    toast(res.error ?? '更新失敗', 'error')
  }
}

window.deleteAccountFromModal = async function() {
  const id = document.getElementById('edit-acc-id').value
  const name = document.getElementById('edit-acc-name-input').value
  if (!confirm(`確定要刪除「${name}」帳戶？`)) return
  const res = await api.deleteAsset(id)
  if (res.ok) { closeEditModal(); toast(`已刪除「${name}」`); load() }
  else toast(res.error ?? '刪除失敗', 'error')
}


function escJs(s) { return s.replace(/'/g, "\\'").replace(/"/g, '\\"') }

document.getElementById('last-sync').textContent =
  '今天 ' + new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })


// 有 cache 時最多等 600ms，沒 cache 等資料回來
const hasCachedData = !!(swr.get('assets'))
if (hasCachedData) setTimeout(hideSplash, 600)
load().then(hideSplash)
}
