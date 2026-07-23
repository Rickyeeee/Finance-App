import { api, toast, formatMoney, initAppName, swr } from '/js/api.js'

// 此模組由 build-spa 從 investments.html 抽出，router 每次進入頁面時呼叫 show()
// Chart 實例放模組層級：重新進入頁面時能 destroy 前一次的實例
let holdingChart = null
let growthChart = null

// router 於 app 啟動後在背景呼叫：預先把本頁資料放進 swr 快取（不碰 DOM）
export async function prefetch() {
  const jobs = []
  if (!swr.get('investments')) {
    jobs.push((async () => {
      const [invRes, tradeRes, assetsRes, pnlRes] = await Promise.all([
        api.getInvestments(), api.getInvestmentTrades(), api.getAssets(), api.getInvestmentPnl(),
      ])
      if (!invRes.ok) return
      const trades = {}
      if (tradeRes.ok) for (const t of tradeRes.data) { const k = t.symbol + '|' + t.account; (trades[k] ||= []).push(t) }
      const accounts = assetsRes?.ok ? (assetsRes.data?.accounts ?? []) : []
      const brokers = accounts.filter(a => a.type === '證券戶' || a.type === '投資帳戶').map(a => a.name)
      swr.set('investments', {
        investments: invRes.data, trades, brokers, summary: invRes.summary,
        pnl: pnlRes?.ok ? pnlRes.data : [], pnlTotal: pnlRes?.total_realized_pnl ?? 0,
      })
    })())
  }
  if (!swr.get('inv-history-month')) {
    jobs.push(api.getInvestmentHistory('month').then(r => {
      if (r.ok) swr.set('inv-history-month', { data: r.data ?? [], start: r.start, end: r.end })
    }))
  }
  await Promise.all(jobs)
}

export default async function show({ signal }) {



let allInvestments = []
let allTrades = {}
let brokerAccountNames = []
let lookupTimer = null
let currentGrowthRange = 'month'
let editingTradeId = null
let currentDetailId = null   // investment.id，唯一識別 (symbol, account) 組合

const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })

// ── 資料載入 ──────────────────────────────
function applyInvData({ investments, trades, brokers, summary, pnl, pnlTotal }) {
  allInvestments = investments
  allTrades = trades
  brokerAccountNames = brokers

  renderSummary(summary)
  renderInvestmentCards()
  renderCharts()
  updateAccountDatalist()
  renderPnlRecords(pnl, pnlTotal)

  if (currentDetailId) {
    const stillExists = allInvestments.some(i => i.id === currentDetailId)
    if (stillExists) renderDetail(allInvestments.find(i => i.id === currentDetailId))
    else closeDetail()
  }
}

async function loadData() {
  // 快取先渲染
  const cached = swr.get('investments')
  if (cached) applyInvData(cached)

  const [invRes, tradeRes, assetsRes, pnlRes] = await Promise.all([
    api.getInvestments(),
    api.getInvestmentTrades(),
    api.getAssets(),
    api.getInvestmentPnl(),
  ])

  if (assetsRes?.ok) {
    const accounts = assetsRes.data?.accounts ?? []
    window._allAssetAccounts = accounts
    const brokers = accounts.filter(a => a.type === '證券戶' || a.type === '投資帳戶')
    brokerAccountNames = brokers.map(a => a.name)
  }
  if (!invRes.ok) return false

  const trades = {}
  if (tradeRes.ok) {
    for (const t of tradeRes.data) {
      const key = t.symbol + '|' + t.account
      if (!trades[key]) trades[key] = []
      trades[key].push(t)
    }
  }

  const payload = {
    investments: invRes.data,
    trades,
    brokers: brokerAccountNames,
    summary: invRes.summary,
    pnl: pnlRes?.ok ? pnlRes.data : [],
    pnlTotal: pnlRes?.total_realized_pnl ?? 0,
  }
  swr.set('investments', payload)
  applyInvData(payload)
  return true
}

window.load = load  // header「重新整理」onclick 用

async function load() {
  await loadData()
  renderGrowthChart(currentGrowthRange)
  if (allInvestments.length > 0) refreshAll(true)
}

// ── 批量更新市價 ──────────────────────────
window.refreshAll = async function(silent = false) {
  const btn = document.getElementById('refresh-all-btn')
  const status = document.getElementById('refresh-status')
  if (btn) { btn.innerHTML = '<span class="spin">🔄</span>'; btn.disabled = true }
  if (status) status.textContent = '更新中…'

  const res = await api.refreshAllInvestmentPrices()

  if (btn) { btn.innerHTML = '🔄'; btn.disabled = false }

  if (res.ok) {
    const time = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    if (status) status.textContent = `已更新 ${res.updated}/${res.total} 檔　${time}`
    if (!silent) toast(`市價已更新（${res.updated}/${res.total} 檔）`)
    // 直接用回傳的資料更新 UI，不需要再打一次 GET
    if (res.data && res.summary) {
      allInvestments = res.data
      renderSummary(res.summary)
      renderInvestmentCards()
      renderCharts()
      if (currentDetailId) {
        const stillExists = allInvestments.some(i => i.id === currentDetailId)
        if (stillExists) renderDetail(allInvestments.find(i => i.id === currentDetailId))
        else closeDetail()
      }
    } else {
      await loadData()
    }
  } else {
    if (status) status.textContent = '更新失敗'
    if (!silent) toast('市價更新失敗', 'error')
  }
}

// ── 摘要卡片 ──────────────────────────────
function renderSummary(summary) {
  document.getElementById('total-value').textContent = formatMoney(summary.total_value)
  document.getElementById('total-cost-sub').textContent = `成本 ${formatMoney(Math.round(summary.total_cost))}`

  const dailyEl = document.getElementById('total-daily-pnl')
  if (summary.total_daily_pnl !== 0) {
    dailyEl.textContent = formatMoney(summary.total_daily_pnl)
    dailyEl.style.color = summary.total_daily_pnl >= 0 ? 'var(--success)' : 'var(--danger)'
  } else {
    dailyEl.textContent = '–'
    dailyEl.style.color = 'var(--text-muted)'
  }

  const pnlEl = document.getElementById('total-pnl')
  pnlEl.textContent = formatMoney(summary.total_profit_loss)
  pnlEl.style.color = summary.total_profit_loss >= 0 ? 'var(--success)' : 'var(--danger)'
  document.getElementById('overall-return-sub').textContent = Math.abs(summary.overall_return).toFixed(2) + '%'

  const realEl = document.getElementById('total-realized-pnl')
  const rp = summary.total_realized_pnl ?? 0
  if (rp !== 0) {
    realEl.textContent = formatMoney(rp)
    realEl.style.color = rp >= 0 ? 'var(--success)' : 'var(--danger)'
  } else {
    realEl.textContent = '–'
    realEl.style.color = 'var(--text-muted)'
  }

  document.getElementById('holding-count').textContent = allInvestments.length + ' 檔持股'
}

// ── 持股卡片（按證券戶分組） ──────────────
function renderInvestmentCards() {
  const container = document.getElementById('inv-list')
  if (!allInvestments.length) {
    container.innerHTML = '<div class="empty-state">尚無持股<p>上傳 Holdary CSV 或新增交易記錄</p></div>'
    return
  }

  const groups = {}
  for (const inv of allInvestments) {
    if (inv.shares <= 0) continue  // 跳過已清空持倉
    if (!groups[inv.account]) groups[inv.account] = []
    groups[inv.account].push(inv)
  }
  if (!Object.keys(groups).length) {
    container.innerHTML = '<div class="empty-state">尚無持股<p>上傳 Holdary CSV 或新增交易記錄</p></div>'
    return
  }

  let html = ''
  for (const [account, invs] of Object.entries(groups)) {
    const groupValue = invs.reduce((s, i) => s + i.market_value, 0)
    const groupPnl = invs.reduce((s, i) => s + i.profit_loss, 0)
    const pnlColor = groupPnl >= 0 ? 'var(--success)' : 'var(--danger)'

    html += `<div class="broker-section">
      <div class="broker-header">
        <span class="broker-name">🏦 ${escHtml(account)}</span>
        <div class="broker-summary">
          <span>${formatMoney(groupValue)}</span>
          <span style="color:${pnlColor}">${formatMoney(groupPnl)}</span>
        </div>
      </div>`

    const totalValue = allInvestments.reduce((s, i) => s + i.market_value, 0)
    for (const inv of invs) html += renderInvCard(inv, totalValue)
    html += '</div>'
  }

  container.innerHTML = html
}

function renderInvCard(inv, totalPortfolio = 0) {
  const perShare = inv.current_price || (inv.shares > 0 ? inv.market_value / inv.shares : 0)
  const priceStr = perShare > 0
    ? '$' + perShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '–'

  const s = v => v >= 0 ? '+' : '-'   // 正負號，formatMoney 已用 Math.abs

  // 現價漲跌
  let dailyRateStr = '', dailyColor = 'var(--text-muted)', dailyPnl = 0, dailyPnlStr = '–'
  if (inv.current_price && inv.previous_close && inv.previous_close > 0) {
    const rate = (inv.current_price - inv.previous_close) / inv.previous_close * 100
    dailyPnl = Math.round((inv.current_price - inv.previous_close) * inv.shares)
    dailyColor = rate >= 0 ? 'var(--success)' : 'var(--danger)'
    dailyRateStr = `${Math.abs(rate).toFixed(2)}%`
    dailyPnlStr = formatMoney(dailyPnl)
  }

  // 市值占比
  const weight = totalPortfolio > 0 ? (inv.market_value / totalPortfolio * 100).toFixed(1) : '–'

  // 累計損益
  const pnlColor = inv.profit_loss >= 0 ? 'var(--success)' : 'var(--danger)'

  return `<div class="inv-card" onclick="openDetail('${escJs(inv.id)}')">

    <!-- 第一行：名稱 + 現價 -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
      <div style="min-width:0;flex:1">
        <div class="inv-symbol">${inv.symbol}</div>
        <div class="inv-name">${escHtml(inv.name)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${inv.shares.toLocaleString()} 股</div>
      </div>
      <div style="text-align:right;flex-shrink:0;margin-left:12px">
        <div style="font-size:17px;font-weight:700;letter-spacing:-0.5px;color:${dailyColor}">${priceStr}</div>
        ${dailyRateStr ? `<div style="font-size:12px;font-weight:600;color:${dailyColor}">${dailyRateStr}</div>` : '<div style="font-size:11px;color:var(--text-muted)">–</div>'}
      </div>
    </div>

    <!-- 分隔線 -->
    <div style="height:1px;background:var(--border);margin-bottom:10px;opacity:0.5"></div>

    <!-- 三行資訊 -->
    <div style="display:flex;flex-direction:column;gap:6px;font-size:13px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--text-muted)">市值</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:600;color:var(--accent)">${formatMoney(inv.market_value)}</span>
          <span style="font-size:11px;color:var(--text-muted);background:var(--surface2);padding:1px 6px;border-radius:4px">${weight}%</span>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--text-muted)">單日損益</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:600;color:${dailyColor}">${dailyPnlStr}</span>
          ${dailyRateStr ? `<span style="font-size:11px;color:${dailyColor};background:rgba(0,0,0,0.2);padding:1px 6px;border-radius:4px">${dailyRateStr}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--text-muted)">累計損益</span>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:600;color:${pnlColor}">${formatMoney(inv.profit_loss)}</span>
          <span style="font-size:11px;color:${pnlColor};background:rgba(0,0,0,0.2);padding:1px 6px;border-radius:4px">${Math.abs(inv.return_rate).toFixed(2)}%</span>
        </div>
      </div>
    </div>

  </div>`
}

// ── 個股詳情面板 ──────────────────────────
window.openDetail = function(invId) {
  const inv = allInvestments.find(i => i.id === invId)
  if (!inv) return
  currentDetailId = invId
  renderDetail(inv)
  document.getElementById('detail-panel').classList.add('open')
}

window.closeDetail = function() {
  document.getElementById('detail-panel').classList.remove('open')
  currentDetailId = null
}

function renderDetail(inv) {
  if (!inv) return
  const symbol = inv.symbol

  document.getElementById('detail-title').textContent = inv.name

  const trades = allTrades[symbol + '|' + inv.account] ?? []
  const totalCost = Math.round(inv.shares * inv.avg_cost)
  const perShare = inv.current_price || (inv.shares > 0 ? inv.market_value / inv.shares : 0)
  const pnlColor = inv.profit_loss >= 0 ? 'var(--success)' : 'var(--danger)'
  const priceDisplay = perShare > 0
    ? '$' + perShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '–'

  let dailyRow = ''
  if (inv.current_price && inv.previous_close) {
    const dailyPnl = Math.round((inv.current_price - inv.previous_close) * inv.shares)
    const dailyRate = ((inv.current_price - inv.previous_close) / inv.previous_close * 100).toFixed(2)
    const dColor = dailyPnl >= 0 ? 'var(--success)' : 'var(--danger)'
    dailyRow = `<div class="detail-pnl-row">
      <span class="detail-pnl-label">今日損益</span>
      <span style="color:${dColor};font-weight:700">${formatMoney(dailyPnl)}<span style="font-size:12px;font-weight:400;margin-left:6px">${Math.abs(parseFloat(dailyRate)).toFixed(2)}%</span></span>
    </div>`
  }

  const tradesHtml = trades.length
    ? trades.map(t => `
      <div class="trade-row">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
          <span class="trade-type type-${t.type === '買入' ? 'buy' : 'sell'}">${t.type}</span>
          <span>${t.shares.toLocaleString()} 股 @ $${t.price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
          <div style="text-align:right">
            <div style="font-weight:600">${formatMoney(t.amount)}</div>
            <div style="font-size:11px;color:var(--text-muted)">${t.date}</div>
          </div>
          <button class="trade-edit" onclick="openEditTradeModal('${t.id}')" title="編輯">✏️</button>
          <button class="trade-del" onclick="deleteTrade('${t.id}','${symbol}')" title="刪除">🗑</button>
        </div>
      </div>`).join('')
    : '<div style="padding:20px 0;font-size:14px;color:var(--text-muted);text-align:center">尚無交易記錄</div>'

  document.getElementById('detail-body').innerHTML = `
    <div style="color:var(--text-muted);font-size:13px;margin-bottom:20px">🏦 ${escHtml(inv.account)}</div>

    <div class="card" style="margin-bottom:16px">
      <table class="detail-table">
        <tr><td>代號</td><td><span style="font-family:monospace;font-weight:700;color:var(--accent)">${inv.symbol}</span></td></tr>
        <tr><td>總股數</td><td>${inv.shares.toLocaleString()} 股</td></tr>
        <tr><td>平均成本</td><td>$${inv.avg_cost.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td></tr>
        <tr><td>市價</td><td>${priceDisplay}</td></tr>
        <tr><td>總成本</td><td>${formatMoney(totalCost)}</td></tr>
        <tr><td>市值</td><td><strong>${formatMoney(inv.market_value)}</strong></td></tr>
      </table>
    </div>

    <div class="detail-pnl-block">
      <div class="detail-pnl-row">
        <span class="detail-pnl-label">未實現損益</span>
        <span style="color:${pnlColor};font-weight:700">${formatMoney(inv.profit_loss)}<span style="font-size:12px;font-weight:400;margin-left:6px">${Math.abs(inv.return_rate).toFixed(2)}%</span></span>
      </div>
      ${dailyRow}
      ${(() => {
        const rp = inv.realized_pnl ?? 0
        if (rp === 0) return ''
        const rpColor = rp >= 0 ? 'var(--success)' : 'var(--danger)'
        return `<div class="detail-pnl-row">
          <span class="detail-pnl-label">已實現損益</span>
          <span style="color:${rpColor};font-weight:700">${formatMoney(rp)}</span>
        </div>`
      })()}
    </div>

    <div class="section-header" style="margin-bottom:12px">
      <div class="section-title">交易記錄</div>
      <button class="btn btn-primary btn-sm" onclick="openAddTradeModal('${inv.symbol}','${escJs(inv.name)}','${escJs(inv.account)}')">新增 +</button>
    </div>

    <div id="detail-trades">${tradesHtml}</div>
  `
}

// ── 編輯持股 ──────────────────────────────
window.openEditDetail = function() {
  const inv = allInvestments.find(i => i.id === currentDetailId)
  if (!inv) return
  document.getElementById('edit-shares').value = inv.shares
  document.getElementById('edit-avg-cost').value = inv.avg_cost
  document.getElementById('edit-inv-modal').classList.add('open')
  // do not auto-select — user taps the field to start editing
}

window.closeEditInv = function() {
  document.getElementById('edit-inv-modal').classList.remove('open')
}

window.saveEditInv = async function() {
  const inv = allInvestments.find(i => i.id === currentDetailId)
  if (!inv) return
  const shares = parseFloat(document.getElementById('edit-shares').value)
  const avg_cost = parseFloat(document.getElementById('edit-avg-cost').value)
  if (isNaN(shares) || shares < 0) { toast('請輸入有效股數', 'error'); return }
  if (isNaN(avg_cost) || avg_cost < 0) { toast('請輸入有效成本', 'error'); return }

  const res = await api.updateInvestment(inv.id, { shares, avg_cost })
  if (res.ok) {
    closeEditInv()
    toast('已更新持股')
    await loadData()
  } else {
    toast(res.error ?? '更新失敗', 'error')
  }
}

// ── 新增交易 Modal ────────────────────────
// ── 已實現損益記錄 ──────────────────────────
function renderPnlRecords(records, totalPnl) {
  const container = document.getElementById('pnl-list')
  const badge = document.getElementById('pnl-total-badge')

  if (badge) {
    const color = totalPnl >= 0 ? 'var(--success)' : 'var(--danger)'
    badge.style.color = color
    badge.textContent = records.length ? `累計 NT$${Math.abs(totalPnl).toLocaleString()}` : ''
  }

  if (!records.length) {
    container.innerHTML = '<div class="empty-state" style="padding:20px 0">尚無賣出記錄</div>'
    return
  }

  const rows = records.map(t => {
    const pnl = t.realized_pnl ?? 0
    const cls = pnl >= 0 ? 'pnl-pos' : 'pnl-neg'
    const toAcct = t.to_account ? `<span style="color:var(--text-muted)">${escHtml(t.to_account)}</span>` : '–'
    const perShare = t.shares > 0 ? ((t.realized_pnl ?? 0) / t.shares).toFixed(1) : '–'
    return `<tr>
      <td style="color:var(--text-muted)">${t.date}</td>
      <td><strong>${escHtml(t.symbol)}</strong> ${escHtml(t.name)}</td>
      <td style="text-align:right">${t.shares.toLocaleString()}</td>
      <td style="text-align:right">$${Number(t.price).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      <td style="text-align:right">NT$${t.amount.toLocaleString()}</td>
      <td style="text-align:right" class="${cls}">NT$${Math.abs(pnl).toLocaleString()}</td>
      <td style="text-align:right">${toAcct}</td>
      <td style="text-align:center"><button class="trade-del" onclick="deleteTrade('${t.id}')" title="刪除" style="font-size:14px;padding:2px 6px">🗑</button></td>
    </tr>`
  }).join('')

  container.innerHTML = `
    <div style="overflow-x:auto">
      <table class="pnl-table">
        <thead><tr>
          <th>日期</th><th>股票</th>
          <th style="text-align:right">股數</th>
          <th style="text-align:right">賣出價</th>
          <th style="text-align:right">賣出金額</th>
          <th style="text-align:right">已實現損益</th>
          <th style="text-align:right">入帳帳戶</th>
          <th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
}

function updateAccountDatalist() {
  // 優先用帳戶管理的證券戶，fallback 到現有投資紀錄的帳戶名稱
  const fromInvestments = [...new Set(allInvestments.map(i => i.account).filter(Boolean))]
  const opts = brokerAccountNames.length
    ? [...new Set([...brokerAccountNames, ...fromInvestments])]
    : fromInvestments
  const select = document.getElementById('trade-account')
  const prev = select.value
  select.innerHTML = opts.length
    ? opts.map(a => `<option value="${escHtml(a)}">${escHtml(a)}</option>`).join('')
    : '<option value="">（尚無證券戶）</option>'
  if (prev && opts.includes(prev)) select.value = prev

  // 入帳帳戶選項（非證券戶）：存入 data-all 供 updateToAccountGroup 使用
  // value 用 id（跨類別同名帳戶才不會選錯），data-name 存名稱供顯示與送出用
  const toSel = document.getElementById('trade-to-account')
  if (toSel && window._allAssetAccounts) {
    const nonBroker = window._allAssetAccounts
      .filter(a => a.type !== '證券戶' && a.type !== '投資帳戶')
      .map(a => ({ id: a.id, name: a.name }))
    toSel.dataset.all = JSON.stringify(nonBroker)
  }
}

window.openAddTradeModal = function(symbol = '', name = '', account = '') {
  document.getElementById('trade-symbol').value = symbol
  document.getElementById('trade-name').value = name
  const acctSelect = document.getElementById('trade-account')
  const targetAcct = account || allInvestments[0]?.account || ''
  if (targetAcct && [...acctSelect.options].some(o => o.value === targetAcct)) {
    acctSelect.value = targetAcct
  } else if (acctSelect.options.length) {
    acctSelect.selectedIndex = 0
  }
  document.getElementById('trade-modal-title').textContent = '新增交易'
  document.getElementById('trade-symbol').readOnly = false
  editingTradeId = null
  document.getElementById('trade-type').value = '買入'
  document.getElementById('trade-date').value = today
  document.getElementById('trade-shares').value = ''
  document.getElementById('trade-price').value = ''
  document.getElementById('trade-note').value = ''
  document.getElementById('trade-amount-preview').style.display = 'none'
  document.getElementById('trade-lookup-hint').textContent = ''
  updateToAccountGroup('買入')
  document.getElementById('add-trade-modal').classList.add('open')
  setTimeout(() => document.getElementById(symbol ? 'trade-shares' : 'trade-symbol').focus(), 50)
}

// 切換買/賣時顯示入帳帳戶
document.getElementById('trade-type').addEventListener('change', e => {
  updateToAccountGroup(e.target.value)
  calcTradeAmount()
})

function updateToAccountGroup(type) {
  const group = document.getElementById('to-account-group')
  group.style.display = type === '賣出' ? 'block' : 'none'
  if (type === '賣出') {
    // 填充非證券戶帳戶選項（銀行、現金）
    const sel = document.getElementById('trade-to-account')
    const all = JSON.parse(sel.dataset.all || '[]')
    if (!all.length) return
    sel.innerHTML = '<option value="">－ 不指定 －</option>' +
      all.map(a => `<option value="${escHtml(a.id)}">${escHtml(a.name)}</option>`).join('')
  }
}

window.closeAddTradeModal = function() {
  document.getElementById('add-trade-modal').classList.remove('open')
  editingTradeId = null
}

window.openEditTradeModal = function(tradeId) {
  // 從 allTrades 找到這筆交易
  let trade = null
  for (const trades of Object.values(allTrades)) {
    trade = trades.find(t => t.id === tradeId)
    if (trade) break
  }
  if (!trade) return

  editingTradeId = tradeId
  document.getElementById('trade-modal-title').textContent = '編輯交易'
  document.getElementById('trade-symbol').value = trade.symbol
  document.getElementById('trade-symbol').readOnly = true
  document.getElementById('trade-name').value = trade.name
  document.getElementById('trade-type').value = trade.type
  document.getElementById('trade-date').value = trade.date
  document.getElementById('trade-shares').value = trade.shares
  document.getElementById('trade-price').value = trade.price
  document.getElementById('trade-note').value = trade.note ?? ''
  document.getElementById('trade-lookup-hint').textContent = ''
  updateToAccountGroup(trade.type)
  calcTradeAmount()

  // 設定證券戶
  const acctSelect = document.getElementById('trade-account')
  if (trade.account && [...acctSelect.options].some(o => o.value === trade.account)) {
    acctSelect.value = trade.account
  }
  // 設定入帳帳戶（若有）：trade.to_account 是名稱，選項 value 是 id，用名稱找回 id
  if (trade.type === '賣出' && trade.to_account) {
    const toSel = document.getElementById('trade-to-account')
    const toAcctId = (window._allAssetAccounts ?? []).find(a => a.name === trade.to_account)?.id
    if (toAcctId && [...toSel.options].some(o => o.value === toAcctId)) {
      toSel.value = toAcctId
    }
  }

  document.getElementById('add-trade-modal').classList.add('open')
  setTimeout(() => document.getElementById('trade-shares').focus(), 50)
}

window.onSymbolInput = function(raw) {
  const sym = raw.trim().toUpperCase()
  const hint = document.getElementById('trade-lookup-hint')
  const nameInput = document.getElementById('trade-name')

  const inv = allInvestments.find(i => i.symbol === sym)
  if (inv) {
    nameInput.value = inv.name
    document.getElementById('trade-account').value = inv.account
    hint.textContent = ''
    return
  }

  nameInput.value = ''
  clearTimeout(lookupTimer)
  if (sym.length < 4) { hint.textContent = ''; return }

  hint.textContent = '搜尋中…'
  lookupTimer = setTimeout(async () => {
    const res = await api.lookupStock(sym)
    if (res.ok) {
      nameInput.value = res.name
      hint.textContent = `✓ 找到：${res.name}`
      hint.style.color = 'var(--success)'
    } else {
      hint.textContent = '找不到此代號'
      hint.style.color = 'var(--danger)'
    }
  }, 500)
}

window.calcTradeAmount = function() {
  const shares = parseFloat(document.getElementById('trade-shares').value)
  const price = parseFloat(document.getElementById('trade-price').value)
  const type = document.getElementById('trade-type').value
  const preview = document.getElementById('trade-amount-preview')
  if (shares > 0 && price > 0) {
    document.getElementById('trade-amount-value').textContent = 'NT$' + Math.round(shares * price).toLocaleString()
    preview.style.display = 'block'
    // 賣出時顯示預估損益
    const pnlSpan = document.getElementById('trade-pnl-preview')
    const pnlVal = document.getElementById('trade-pnl-value')
    if (type === '賣出') {
      const sym = document.getElementById('trade-symbol').value.trim().toUpperCase()
      const acct = document.getElementById('trade-account').value
      const inv = allInvestments.find(i => i.symbol === sym && i.account === acct)
      if (inv && inv.avg_cost > 0) {
        const pnl = Math.round((price - inv.avg_cost) * shares)
        pnlVal.textContent = `NT$${Math.abs(pnl).toLocaleString()}`
        pnlVal.style.color = pnl >= 0 ? 'var(--success)' : 'var(--danger)'
        pnlSpan.style.display = 'inline'
      } else {
        pnlSpan.style.display = 'none'
      }
    } else {
      pnlSpan.style.display = 'none'
    }
  } else {
    preview.style.display = 'none'
  }
}

window.saveTrade = async function() {
  const symbol = document.getElementById('trade-symbol').value.trim().toUpperCase()
  const name = document.getElementById('trade-name').value.trim()
  const account = document.getElementById('trade-account').value.trim()
  const type = document.getElementById('trade-type').value
  const date = document.getElementById('trade-date').value
  const shares = parseFloat(document.getElementById('trade-shares').value)
  const price = parseFloat(document.getElementById('trade-price').value)
  const note = document.getElementById('trade-note').value.trim()
  const toAccountId = type === '賣出' ? document.getElementById('trade-to-account').value.trim() : ''
  const toAccountObj = (window._allAssetAccounts ?? []).find(a => a.id === toAccountId)
  const toAccount = toAccountObj?.name ?? ''

  if (!symbol) { toast('請輸入股票代號', 'error'); return }
  if (!name) { toast('請輸入（或等候自動填入）股票名稱', 'error'); return }
  if (!account) { toast('請選擇證券戶', 'error'); return }
  if (!shares || shares <= 0) { toast('請輸入有效股數', 'error'); return }
  if (!price || price <= 0) { toast('請輸入有效成交價', 'error'); return }
  if (!date) { toast('請選擇日期', 'error'); return }

  const payload = { symbol, name, account, type, shares, price, date, note: note || undefined }
  if (type === '賣出' && toAccount) { payload.to_account = toAccount; payload.to_account_id = toAccountId }

  const res = editingTradeId
    ? await api.updateInvestmentTrade(editingTradeId, { type, shares, price, date, account, note: note || null })
    : await api.addInvestmentTrade(payload)
  if (res.ok) {
    closeAddTradeModal()
    const pnlMsg = type === '賣出' && toAccount ? `，入帳至 ${toAccount}` : ''
    toast(`已記錄 ${type} ${symbol} ${shares.toLocaleString()} 股${pnlMsg}`)
    await loadData()
  } else {
    toast(res.error ?? '新增失敗', 'error')
  }
}

window.deleteTrade = async function(id, symbol) {
  if (!confirm('確定要刪除這筆交易記錄？')) return
  const res = await api.deleteInvestmentTrade(id)
  if (res.ok) {
    toast('已刪除')
    await loadData()
  } else toast(res.error ?? '刪除失敗', 'error')
}

// ── 圖表 ──────────────────────────────────
function renderCharts() {
  renderHoldingChart(allInvestments)
}

function renderHoldingChart(investments) {
  const ctx = document.getElementById('holdingChart').getContext('2d')
  if (holdingChart) holdingChart.destroy()
  const hasValue = investments.some(i => i.market_value > 0)
  if (!hasValue) {
    ctx.canvas.parentElement.innerHTML = '<div class="empty-state">尚無市值資料</div>'
    return
  }
  holdingChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: investments.map(i => i.name),
      datasets: [{ data: investments.map(i => i.market_value), backgroundColor: ['#bc8cff','#ffa657','#e3b341','#ff7eb6','#39d0d8','#d2a8ff','#f0883e','#a5d6ff'], borderWidth: 1, borderColor: '#161b22' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#8b949e', font: { size: 11 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: NT$${ctx.raw.toLocaleString()}` } }
      }
    }
  })
}

async function renderGrowthChart(range) {
  // 更新 toggle 按鈕樣式
  ;['week','month','year'].forEach(r => {
    const btn = document.getElementById('btn-range-' + r)
    if (!btn) return
    btn.className = r === range ? 'btn btn-sm' : 'btn btn-sm btn-secondary'
  })

  // 快取先畫（切頁零等待），fresh 回來若有變化才重畫
  const key = 'inv-history-' + range
  const cached = swr.get(key)
  if (cached) drawGrowthChart(range, cached)
  const res = await api.getInvestmentHistory(range)
  if (!res.ok) {
    if (!cached) {
      const canvas = document.getElementById('growthChart')
      if (canvas) canvas.parentElement.innerHTML = '<div class="empty-state">尚無歷史快照<p>在資產總覽頁點「快照」以記錄資產</p></div>'
    }
    return
  }
  const slim = { data: res.data ?? [], start: res.start, end: res.end }
  swr.set(key, slim)
  if (cached && JSON.stringify(slim) === JSON.stringify(cached)) return
  drawGrowthChart(range, slim)
}

function drawGrowthChart(range, res) {
  const canvas = document.getElementById('growthChart')
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (growthChart) { growthChart.destroy(); growthChart = null }

  // 建立快照資料索引
  const dataMap = {}
  for (const p of (res.data ?? [])) dataMap[p.snapshot_date] = p.total_investments

  // 今天永遠用即時投資總值覆蓋（不等午夜快照）
  const liveTotalInv = allInvestments.reduce((s, i) => s + (i.market_value ?? 0), 0)
  dataMap[res.end] = liveTotalInv  // 無條件設定，0 也是有效值

  const DAY_NAMES = ['日','一','二','三','四','五','六']
  const labels = []
  const rawValues = []  // 原始值（null = 無資料）

  if (range === 'week' || range === 'month') {
    // 逐日產生完整格子（過去 7 天或 30 天）
    const start = new Date(res.start + 'T00:00:00')
    const end = new Date(res.end + 'T00:00:00')
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const label = range === 'week'
        ? `週${DAY_NAMES[d.getDay()]} ${d.getMonth()+1}/${String(d.getDate()).padStart(2,'0')}`
        : `${d.getMonth()+1}/${String(d.getDate()).padStart(2,'0')}`
      labels.push(label)
      rawValues.push(iso in dataMap ? dataMap[iso] : null)
    }
  } else {
    // 年：過去 12 個月，每月一格
    const start = new Date(res.start + 'T00:00:00')
    const end = new Date(res.end + 'T00:00:00')
    let cur = new Date(start.getFullYear(), start.getMonth(), 1)
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)
    while (cur <= endMonth) {
      const monthKey = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`
      const snap = Object.keys(dataMap).find(k => k.startsWith(monthKey))
      labels.push(`${cur.getMonth()+1}月`)
      rawValues.push(snap != null ? dataMap[snap] : null)
      cur.setMonth(cur.getMonth() + 1)
    }
  }

  // 用前一個已知值填補空白（carry forward），第一筆之前保留 null
  // isCarried：標記哪些點是「猜的」（當天沒有快照，借用前一天的數字），
  // 讓圖表用虛線畫出這段，不要偽裝成真實資料的平線
  const values = []
  const isCarried = []
  let carryVal = null
  for (const v of rawValues) {
    if (v !== null) { carryVal = v; values.push(v); isCarried.push(false) }
    else { values.push(carryVal); isCarried.push(carryVal !== null) }
  }

  if (values.every(v => v === null)) {
    ctx.canvas.parentElement.innerHTML = '<div class="empty-state">尚無歷史快照<p>在資產總覽頁點「快照」以記錄資產</p></div>'
    return
  }

  const nonNull = values.filter(v => v !== null)
  const first = nonNull[0] ?? 0
  const last = nonNull[nonNull.length - 1] ?? 0
  const isUp = last >= first
  const lineColor = isUp ? '#3fb950' : '#f85149'
  const fillColor = isUp ? 'rgba(63,185,80,0.08)' : 'rgba(248,81,73,0.08)'

  // 猜的區段虛線淡灰、有真資料的區段用正常顏色
  const carriedColor = 'rgba(139,148,158,0.55)'

  growthChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: lineColor,
        backgroundColor: fillColor,
        borderWidth: 2,
        pointRadius: (ctx) => ctx.raw !== null && !isCarried[ctx.dataIndex] ? (nonNull.length <= 14 ? 3 : 0) : 0,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.3,
        spanGaps: true,
        segment: {
          borderDash: sctx => (isCarried[sctx.p0DataIndex] || isCarried[sctx.p1DataIndex]) ? [5, 4] : undefined,
          borderColor: sctx => (isCarried[sctx.p0DataIndex] || isCarried[sctx.p1DataIndex]) ? carriedColor : undefined,
        },
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => {
          if (ctx.raw == null) return '無資料'
          const val = 'NT$' + ctx.raw.toLocaleString()
          return isCarried[ctx.dataIndex] ? val + '（無快照，沿用前一筆）' : val
        } } }
      },
      scales: {
        x: { grid: { color: '#30363d' }, ticks: { color: '#8b949e', font: { size: 11 }, maxTicksLimit: 8 } },
        y: {
          grid: { color: '#30363d' },
          ticks: { color: '#8b949e', font: { size: 11 }, callback: (v, i, ticks) => wLabel(v, ticks) }
        }
      },
      interaction: { mode: 'index', intersect: false },
    }
  })
}

// Y 軸標籤：範圍小於 5 萬時用小數，避免整數萬四捨五入後格線標籤重複（如連續三個都顯示「25W」）
function wLabel(v, ticks) {
  const range = Math.abs((ticks.at(-1)?.value ?? v) - (ticks[0]?.value ?? v))
  if (Math.abs(v) < 10000) return 'NT$' + v.toLocaleString()
  const decimals = range < 50000 ? 1 : 0
  return 'NT$' + (v / 10000).toFixed(decimals) + 'W'
}

window.setGrowthRange = async function(range) {
  currentGrowthRange = range
  await renderGrowthChart(range)
}


// ── 工具 ──────────────────────────────────
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
function escJs(s) { return String(s).replace(/'/g,"\\'").replace(/"/g,'\\"') }


load()
}
