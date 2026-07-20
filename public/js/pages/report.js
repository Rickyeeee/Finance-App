import { api, toast, formatMoney, catIcon, initAppName, swr } from '/js/api.js'

// 此模組由 build-spa 從 report.html 抽出，router 每次進入頁面時呼叫 show()
// Chart 實例放模組層級：重新進入頁面時先 destroy 前一次的實例
let chartByTab = { overview: [], detail: [], category: [], account: [], drill: [] }

export default async function show({ signal }) {
Object.values(chartByTab).forEach(arr => { arr.forEach(c => c.destroy()); arr.length = 0 })




// ── 狀態 ──
let mode = 'month'   // 'month' | 'year'
let currentYear = new Date().getFullYear()
let currentMonth = new Date().getMonth() + 1
let activeTab = 'overview'
let allTxns = []
let renderedTabs = new Set()
let drillFilter = null  // null | { type: 'category'|'account', key: string }
let breakdownDir = 'expense'  // 'expense' | 'income'
let acctIconMap = {}   // name → emoji

const ASSET_ICON = { '銀行':'🏦','銀行存款':'🏦','現金':'💵','證券戶':'📈','投資帳戶':'📈','信用卡':'💳' }
const NAME_ICON = { '現金':'💵', '儲值':'🎫' }
function acctIcon(name) { return acctIconMap[name] || NAME_ICON[name] || '💳' }

// ── 工具 ──
function escHtml(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
function pad(n) { return String(n).padStart(2,'0') }

function periodRange() {
  if (mode === 'month') {
    const lastDay = new Date(currentYear, currentMonth, 0).getDate()
    return {
      from: `${currentYear}-${pad(currentMonth)}-01`,
      to:   `${currentYear}-${pad(currentMonth)}-${pad(lastDay)}`,
      label: `${currentYear} / ${pad(currentMonth)}`,
    }
  } else {
    return {
      from: `${currentYear}-01-01`,
      to:   `${currentYear}-12-31`,
      label: `${currentYear} 年`,
    }
  }
}

function updatePeriodLabel() {
  document.getElementById('period-label').textContent = periodRange().label
}

// ── 導航 ──
window.setMode = function(m) {
  mode = m
  document.getElementById('mode-month').className = 'report-mode-btn' + (m === 'month' ? ' active' : '')
  document.getElementById('mode-year').className  = 'report-mode-btn' + (m === 'year'  ? ' active' : '')
  updatePeriodLabel()
  load()
}

window.prevPeriod = function() {
  if (mode === 'month') {
    currentMonth--
    if (currentMonth < 1) { currentMonth = 12; currentYear-- }
  } else {
    currentYear--
  }
  updatePeriodLabel()
  load()
}

window.nextPeriod = function() {
  const now = new Date()
  if (mode === 'month') {
    if (currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1) return
    currentMonth++
    if (currentMonth > 12) { currentMonth = 1; currentYear++ }
  } else {
    if (currentYear >= now.getFullYear()) return
    currentYear++
  }
  updatePeriodLabel()
  load()
}

// ── Tab ──
const ALL_PANELS = ['overview','detail','category','account','drill']

window.setTab = function(tab) {
  drillFilter = null
  breakdownDir = 'expense'
  activeTab = tab
  document.querySelectorAll('.report-tab').forEach((btn, i) => {
    const tabs = ['overview','detail','category','account']
    btn.className = 'report-tab' + (tabs[i] === tab ? ' active' : '')
  })
  ALL_PANELS.forEach(p => {
    document.getElementById(`panel-${p}`).style.display = p === tab ? 'block' : 'none'
  })
  if (!renderedTabs.has(tab)) {
    renderedTabs.add(tab)
    renderByTab(tab)
  }
}

window.openDrill = function(type, key) {
  drillFilter = { type, key, dir: breakdownDir }
  document.getElementById(`panel-${activeTab}`).style.display = 'none'
  document.getElementById('panel-drill').style.display = 'block'
  renderDrill()
}

window.closeDrill = function() {
  drillFilter = null
  document.getElementById('panel-drill').style.display = 'none'
  document.getElementById(`panel-${activeTab}`).style.display = 'block'
}

window.setBreakdownDir = function(dir) {
  breakdownDir = dir
  destroyTabCharts(activeTab)
  renderedTabs.delete(activeTab)
  renderedTabs.add(activeTab)
  renderByTab(activeTab)
}

function renderByTab(tab) {
  if (tab === 'overview')  renderOverview()
  else if (tab === 'detail')   renderDetail()
  else if (tab === 'category') renderCategory()
  else if (tab === 'account')  renderAccount()
}

// ── 載入資料 ──
function applyReportData(txns, accountsData) {
  acctIconMap = {}
  for (const a of (accountsData ?? [])) {
    acctIconMap[a.name] = ASSET_ICON[a.type] || '💳'
  }
  allTxns = txns
  destroyCharts()
  renderedTabs.clear()
  drillFilter = null
  ALL_PANELS.forEach(p => {
    const el = document.getElementById(`panel-${p}`)
    el.style.display = 'none'
    el.innerHTML = ''
  })
  const activePanel = document.getElementById(`panel-${activeTab}`)
  activePanel.style.display = 'block'
  renderedTabs.add(activeTab)
  renderByTab(activeTab)
  const otherTabs = ['overview','detail','category','account'].filter(t => t !== activeTab)
  const prerender = () => {
    for (const tab of otherTabs) {
      if (renderedTabs.has(tab)) continue
      const panel = document.getElementById(`panel-${tab}`)
      panel.style.cssText = 'display:block;position:absolute;visibility:hidden;pointer-events:none;width:100%;top:0;left:0;z-index:-1'
      renderedTabs.add(tab)
      renderByTab(tab)
      panel.style.cssText = 'display:none'
    }
  }
  'requestIdleCallback' in window ? requestIdleCallback(prerender) : setTimeout(prerender, 200)
}

async function load() {
  const { from, to, label } = periodRange()
  const cacheKey = `report-${from}-${to}`
  const cached = swr.get(cacheKey)
  if (cached) {
    applyReportData(cached.txns, cached.accounts)
  } else {
    ALL_PANELS.forEach(p => {
      const el = document.getElementById(`panel-${p}`)
      el.style.display = 'none'
      el.innerHTML = ''
    })
    document.getElementById(`panel-${activeTab}`).style.display = 'block'
    document.getElementById(`panel-${activeTab}`).innerHTML = '<div class="card" style="text-align:center;padding:40px;color:var(--text-muted)">載入中…</div>'
  }

  const [res, assetsRes] = await Promise.all([
    api.getTransactions({ date_from: from, date_to: to, limit: 2000 }),
    api.getAssets()
  ])
  if (!res.ok) return
  const accounts = assetsRes.ok ? (assetsRes.data?.accounts ?? []) : []
  swr.set(cacheKey, { txns: res.data ?? [], accounts })
  applyReportData(res.data ?? [], accounts)
}

function destroyCharts() {
  Object.values(chartByTab).forEach(arr => { arr.forEach(c => c.destroy()); arr.length = 0 })
}

function destroyTabCharts(tab) {
  chartByTab[tab].forEach(c => c.destroy())
  chartByTab[tab] = []
}

// ── 資料解析 ──
function isTransfer(t) { return !!t.transfer_id }

function expenses()  { return allTxns.filter(t => t.type === '支出' && !isTransfer(t)) }
function incomes()   { return allTxns.filter(t => t.type === '收入' && !isTransfer(t)) }
function xferOut()   { return allTxns.filter(t => t.type === '支出' && isTransfer(t)) }
function xferIn()    { return allTxns.filter(t => t.type === '收入' && isTransfer(t)) }

function sum(arr) { return arr.reduce((s, t) => s + t.amount, 0) }


// ═══════════════════════════════
// 鑽取明細（類別 or 帳戶）
// ═══════════════════════════════
function renderDrill() {
  const { type, key, dir } = drillFilter
  const pool = dir === 'income' ? incomes() : expenses()
  const filtered = pool.filter(t => type === 'category' ? t.category === key : (t.card || '未分類') === key)
  const total = sum(filtered)

  // 按日期分組
  const byDate = {}
  filtered.forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = []
    byDate[t.date].push(t)
  })
  const dates = Object.keys(byDate).sort().reverse()

  let listHtml = ''
  dates.forEach(date => {
    const txns = byDate[date]
    const [y,m,d] = date.split('-')
    const dow = ['日','一','二','三','四','五','六'][new Date(date+'T00:00:00').getDay()]
    const dayTotal = sum(txns)
    listHtml += `<div class="detail-date-header">
      <span>${y}/${m}/${d} 週${dow}</span>
    </div>`
    txns.sort((a,b) => b.amount - a.amount).forEach(t => {
      listHtml += `<div class="detail-txn-row">
        <div class="detail-txn-icon">${catIcon(t.category)}</div>
        <div class="detail-txn-info">
          <div class="detail-txn-name">${escHtml(t.name || t.category)}</div>
          <div class="detail-txn-sub">${escHtml(t.category)}${t.card ? ` · ${escHtml(t.card)}` : ''}</div>
        </div>
        <div class="detail-txn-amt" style="color:${dir==='income'?'var(--success)':'var(--danger)'}">$${t.amount.toLocaleString()}</div>
      </div>`
    })
  })

  const dirColor = dir === 'income' ? 'var(--success)' : 'var(--danger)'
  const dirLabel = dir === 'income' ? '收入' : '支出'
  document.getElementById('panel-drill').innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <button onclick="closeDrill()" style="background:none;border:none;color:var(--text-muted);font-size:20px;cursor:pointer;padding:0 4px;line-height:1">‹</button>
        <div>
          <div style="font-size:15px;font-weight:600">${escHtml(key)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${filtered.length} 筆${dirLabel}</div>
        </div>
        <div style="margin-left:auto;font-size:16px;font-weight:700;color:${dirColor}">$${total.toLocaleString()}</div>
      </div>
    </div>
    <div class="card">
      ${listHtml || '<div style="padding:24px 0;text-align:center;color:var(--text-muted)">無紀錄</div>'}
    </div>`
}

// ═══════════════════════════════
// 總覽
// ═══════════════════════════════
function renderOverview() {
  const exp = sum(expenses())
  const inc = sum(incomes())
  const out = sum(xferOut())
  const inn = sum(xferIn())
  const net = inc - exp

  const rows = [
    { label:'支出', count: expenses().length, amt: exp, color:'#f85149', sign: -1 },
    { label:'收入', count: incomes().length,  amt: inc, color:'#3fb950', sign: 1 },
    { label:'轉出', count: xferOut().length,  amt: out, color:'#e3a246', sign: -1 },
    { label:'轉入', count: xferIn().length,   amt: inn, color:'#a5d6ff', sign: 1 },
  ].filter(r => r.count > 0)

  const maxAmt = Math.max(...rows.map(r => r.amt), 1)

  // 支出分類圓圈
  const expCatTotals = {}
  expenses().forEach(t => { expCatTotals[t.category] = (expCatTotals[t.category] || 0) + t.amount })
  const expSorted = Object.entries(expCatTotals).sort((a,b) => b[1]-a[1]).slice(0, 5)
  const totalExp = exp || 1
  const expCirclesHtml = expSorted.length ? `
    <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin:16px 0 8px">支出分類</div>
    <div class="cat-circles" id="mini-donut-exp">
      ${expSorted.map(([cat, amt], i) => `
        <div class="cat-circle-item">
          <div class="cat-donut-wrap">
            <canvas id="mini-exp-${i}"></canvas>
            <div class="cat-donut-pct">${Math.round(amt/totalExp*100)}%</div>
          </div>
          <div class="cat-circle-label">${escHtml(cat)}</div>
          <div class="cat-circle-amt" style="color:var(--danger)">$${amt.toLocaleString()}</div>
        </div>`).join('')}
    </div>` : ''

  // 收入分類圓圈
  const incCatTotals = {}
  incomes().forEach(t => { incCatTotals[t.category] = (incCatTotals[t.category] || 0) + t.amount })
  const incSorted = Object.entries(incCatTotals).sort((a,b) => b[1]-a[1]).slice(0, 5)
  const totalInc = inc || 1
  const incCirclesHtml = incSorted.length ? `
    <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin:16px 0 8px">收入分類</div>
    <div class="cat-circles" id="mini-donut-inc">
      ${incSorted.map(([cat, amt], i) => `
        <div class="cat-circle-item">
          <div class="cat-donut-wrap">
            <canvas id="mini-inc-${i}"></canvas>
            <div class="cat-donut-pct">${Math.round(amt/totalInc*100)}%</div>
          </div>
          <div class="cat-circle-label">${escHtml(cat)}</div>
          <div class="cat-circle-amt" style="color:var(--success)">$${amt.toLocaleString()}</div>
        </div>`).join('')}
    </div>` : ''

  let circlesHtml = expCirclesHtml + incCirclesHtml

  // 年份模式：每月支出柱狀圖
  let yearBarsHtml = ''
  if (mode === 'year') {
    const monthlyExp = Array(12).fill(0)
    expenses().forEach(t => {
      const m = parseInt(t.date.slice(5,7)) - 1
      monthlyExp[m] += t.amount
    })
    const maxM = Math.max(...monthlyExp, 1)
    yearBarsHtml = `
      <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin:16px 0 6px">每月支出</div>
      <div class="year-bars">
        ${monthlyExp.map((v,i) => {
          const valStr = v >= 10000 ? (v/10000).toFixed(1)+'W' : v > 0 ? '$'+v.toLocaleString() : ''
          return `
          <div class="year-bar-col">
            <div class="year-bar-val">${valStr}</div>
            <div class="year-bar" style="height:${Math.round(v/maxM*70)+2}px;background:#f85149;opacity:${v?1:0.2}"></div>
            <div class="year-bar-label">${i+1}月</div>
          </div>`
        }).join('')}
      </div>`
  }

  document.getElementById('panel-overview').innerHTML = `
    <div class="card" style="margin-bottom:16px">
      ${rows.map(r => `
        <div class="summary-row">
          <div class="summary-badge" style="background:${r.color}">${r.count}</div>
          <div class="summary-label">${r.label}</div>
          <div class="summary-bar-wrap">
            <div class="summary-bar" style="width:${Math.round(r.amt/maxAmt*100)}%;background:${r.color}"></div>
          </div>
          <div class="summary-amount" style="color:${r.color}">$${r.amt.toLocaleString()}</div>
        </div>
      `).join('')}
      <div class="net-row">
        <div class="net-label">${net>=0?'淨收入':'淨支出'}</div>
        <div class="net-amt" style="color:${net>=0?'var(--success)':'var(--danger)'}">
          $${Math.abs(net).toLocaleString()}
        </div>
      </div>
      ${yearBarsHtml}
      ${circlesHtml}
    </div>`

  // 畫 mini donut（支出）
  const EXP_COLORS = ['#bc8cff','#ffa657','#e3b341','#ff7eb6','#39d0d8']
  expSorted.forEach(([, amt], i) => {
    const canvas = document.getElementById(`mini-exp-${i}`)
    if (!canvas) return
    const pct = amt / totalExp
    chartByTab.overview.push(new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: { datasets: [{ data: [pct, 1-pct], backgroundColor: [EXP_COLORS[i], 'rgba(48,54,61,0.4)'], borderWidth: 0 }] },
      options: { responsive: false, cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: false }
    }))
  })

  // 畫 mini donut（收入）
  const INC_COLORS = ['#3fb950','#58a6ff','#79c0ff','#56d364','#26a641']
  incSorted.forEach(([, amt], i) => {
    const canvas = document.getElementById(`mini-inc-${i}`)
    if (!canvas) return
    const pct = amt / totalInc
    chartByTab.overview.push(new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: { datasets: [{ data: [pct, 1-pct], backgroundColor: [INC_COLORS[i], 'rgba(48,54,61,0.4)'], borderWidth: 0 }] },
      options: { responsive: false, cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: false }
    }))
  })
}

// ═══════════════════════════════
// 明細
// ═══════════════════════════════
function renderDetail() {
  // 依日期分組（只看支出）
  const byDate = {}
  const chartByDate = {}

  allTxns.filter(t => !isTransfer(t)).forEach(t => {
    if (!byDate[t.date]) byDate[t.date] = []
    byDate[t.date].push(t)
    if (t.type === '支出') chartByDate[t.date] = (chartByDate[t.date] || 0) + t.amount
  })

  const dates = Object.keys(byDate).sort()

  // 產生日期軸（填補空白）
  let chartLabels = [], chartValues = []
  if (mode === 'month') {
    const lastDay = new Date(currentYear, currentMonth, 0).getDate()
    for (let d = 1; d <= lastDay; d++) {
      const key = `${currentYear}-${pad(currentMonth)}-${pad(d)}`
      chartLabels.push(`${currentMonth}/${d}`)
      chartValues.push(chartByDate[key] || 0)
    }
  } else {
    for (let m = 1; m <= 12; m++) {
      const prefix = `${currentYear}-${pad(m)}`
      const val = Object.entries(chartByDate).filter(([k]) => k.startsWith(prefix)).reduce((s,[,v]) => s+v, 0)
      chartLabels.push(`${m}月`)
      chartValues.push(val)
    }
  }

  const totalExp = chartValues.reduce((s,v)=>s+v,0)
  const avgLabel = mode === 'month'
    ? (() => { const days = new Date(currentYear, currentMonth, 0).getDate(); return `日均支出 $${Math.round(totalExp/days).toLocaleString()}` })()
    : (() => { const months = chartValues.filter(v=>v>0).length || 1; return `月均支出 $${Math.round(totalExp/months).toLocaleString()}` })()

  // 列表 HTML
  let listHtml = ''
  dates.reverse().forEach(date => {
    const txns = byDate[date]
    const dailyExp = txns.filter(t=>t.type==='支出'&&!isTransfer(t)).reduce((s,t)=>s+t.amount,0)
    const dailyInc = txns.filter(t=>t.type==='收入'&&!isTransfer(t)).reduce((s,t)=>s+t.amount,0)
    const net = dailyInc - dailyExp
    const [y,m,d] = date.split('-')
    const dow = ['日','一','二','三','四','五','六'][new Date(date+'T00:00:00').getDay()]
    listHtml += `<div class="detail-date-header">
      <span>${y}/${m}/${d} 週${dow}</span>
    </div>`

    txns.sort((a,b) => b.amount - a.amount).forEach(t => {
      const isXfer = isTransfer(t)
      const color = t.type==='收入'?'var(--success)':isXfer?'var(--text-muted)':'var(--danger)'
      listHtml += `<div class="detail-txn-row">
        <div class="detail-txn-icon">${catIcon(t.category)}</div>
        <div class="detail-txn-info">
          <div class="detail-txn-name">${escHtml(t.name || t.category)}</div>
          <div class="detail-txn-sub">${escHtml(t.category)}${t.card?` · ${escHtml(t.card)}`:''}</div>
        </div>
        <div class="detail-txn-amt" style="color:${color}">$${t.amount.toLocaleString()}</div>
      </div>`
    })
  })

  document.getElementById('panel-detail').innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <div class="detail-chart-wrap"><canvas id="detail-chart"></canvas></div>
      <div style="font-size:11px;color:var(--text-muted);text-align:right;margin-bottom:4px">
        ${avgLabel}
      </div>
    </div>
    <div class="card">
      ${listHtml || '<div style="padding:24px 0;text-align:center;color:var(--text-muted)">此期間無紀錄</div>'}
    </div>`

  // Chart
  const ctx = document.getElementById('detail-chart').getContext('2d')
  chartByTab.detail.push(new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartLabels,
      datasets: [{
        data: chartValues,
        backgroundColor: 'rgba(248,81,73,0.7)',
        borderColor: '#f85149',
        borderWidth: 1,
        borderRadius: 3,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `$${ctx.raw.toLocaleString()}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8b949e', font: { size: 10 }, maxTicksLimit: mode==='month'?10:12 } },
        y: { grid: { color: '#30363d' }, ticks: { color: '#8b949e', font: { size: 10 }, callback: v => v>=10000?(v/10000)+'W':'$'+v } },
      },
    }
  }))
}

// ═══════════════════════════════
// 類別
// ═══════════════════════════════
const CAT_COLORS = ['#bc8cff','#ffa657','#e3b341','#ff7eb6','#39d0d8','#58a6ff','#d2a8ff','#f0883e','#a5d6ff','#7ee787']

function renderCategory() {
  const pool = breakdownDir === 'income' ? incomes() : expenses()
  const dirColor = breakdownDir === 'income' ? 'var(--success)' : 'var(--danger)'
  const dirLabel = breakdownDir === 'income' ? '收入' : '支出'

  const catTotals = {}
  pool.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount })
  const sorted = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])
  const total = sum(pool) || 1

  const donutData = sorted.slice(0,9)
  const otherAmt = sorted.slice(9).reduce((s,[,v])=>s+v,0)
  if (otherAmt > 0) donutData.push(['其他', otherAmt])

  const toggleHtml = `
    <div style="display:flex;gap:4px;background:var(--surface2);border-radius:8px;padding:3px;margin-bottom:12px;width:fit-content">
      <button onclick="setBreakdownDir('expense')" style="background:${breakdownDir==='expense'?'var(--surface)':'none'};border:none;color:${breakdownDir==='expense'?'var(--text)':'var(--text-muted)'};font-size:12px;font-weight:600;padding:4px 14px;border-radius:6px;cursor:pointer">支出</button>
      <button onclick="setBreakdownDir('income')"  style="background:${breakdownDir==='income' ?'var(--surface)':'none'};border:none;color:${breakdownDir==='income' ?'var(--text)':'var(--text-muted)'};font-size:12px;font-weight:600;padding:4px 14px;border-radius:6px;cursor:pointer">收入</button>
    </div>`

  document.getElementById('panel-category').innerHTML = `
    <div class="card" style="margin-bottom:16px">
      ${toggleHtml}
      <div class="main-donut-wrap"><canvas id="cat-donut"></canvas>
        <div class="main-donut-center">
          <div class="main-donut-total" style="color:${dirColor}">$${sum(pool).toLocaleString()}</div>
          <div class="main-donut-label">${dirLabel}總計</div>
        </div>
      </div>
    </div>
    <div class="card">
      ${sorted.map(([cat, amt], i) => `
        <div class="breakdown-row" style="cursor:pointer" data-drill-type="category" data-drill-key="${escHtml(cat)}" onclick="openDrill(this.dataset.drillType,this.dataset.drillKey)">
          <div class="breakdown-icon" style="background:${CAT_COLORS[i]||'var(--surface2)'}22;border:2px solid ${CAT_COLORS[i]||'var(--border)'}">
            <span>${catIcon(cat)}</span>
          </div>
          <div class="breakdown-info">
            <div class="breakdown-name">${escHtml(cat)}</div>
            <div class="breakdown-sub">${pool.filter(t=>t.category===cat).length} 筆</div>
          </div>
          <div class="breakdown-right">
            <div class="breakdown-amt" style="color:${dirColor}">$${amt.toLocaleString()}</div>
            <div class="breakdown-pct">${(amt/total*100).toFixed(1)}%</div>
          </div>
        </div>
      `).join('')}
      ${sorted.length===0?`<div style="padding:24px 0;text-align:center;color:var(--text-muted)">此期間無${dirLabel}</div>`:''}
      ${sorted.length>0?`<div class="breakdown-row" style="border-top:1px solid var(--border);margin-top:4px;padding-top:12px">
        <div class="breakdown-info"><div class="breakdown-name" style="font-weight:700">總計</div></div>
        <div class="breakdown-right"><div class="breakdown-amt" style="font-size:16px;color:${dirColor}">$${sum(pool).toLocaleString()}</div></div>
      </div>`:''}
    </div>`

  if (donutData.length) {
    const ctx = document.getElementById('cat-donut').getContext('2d')
    chartByTab.category.push(new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: donutData.map(([c])=>c),
        datasets: [{ data: donutData.map(([,v])=>v), backgroundColor: donutData.map((_,i)=>CAT_COLORS[i]||'#888'), borderWidth: 2, borderColor: '#161b22' }]
      },
      options: {
        responsive: false,
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: $${ctx.raw.toLocaleString()} (${(ctx.raw/total*100).toFixed(1)}%)` } }
        }
      }
    }))
  }
}

// ═══════════════════════════════
// 帳戶
// ═══════════════════════════════
function renderAccount() {
  const pool = breakdownDir === 'income' ? incomes() : expenses()
  const dirColor = breakdownDir === 'income' ? 'var(--success)' : 'var(--danger)'
  const dirLabel = breakdownDir === 'income' ? '收入' : '支出'

  const acctTotals = {}
  pool.forEach(t => {
    const key = t.card || '未分類'
    acctTotals[key] = (acctTotals[key] || 0) + t.amount
  })
  const sorted = Object.entries(acctTotals).sort((a,b)=>b[1]-a[1])
  const total = sum(pool) || 1

  const donutData = sorted.slice(0,9)
  const otherAmt = sorted.slice(9).reduce((s,[,v])=>s+v,0)
  if (otherAmt > 0) donutData.push(['其他', otherAmt])

  const ACCT_COLORS = ['#f85149','#ff7eb6','#ffa657','#e3b341','#bc8cff','#58a6ff','#39d0d8','#7ee787','#d2a8ff','#f0883e']

  const toggleHtml = `
    <div style="display:flex;gap:4px;background:var(--surface2);border-radius:8px;padding:3px;margin-bottom:12px;width:fit-content">
      <button onclick="setBreakdownDir('expense')" style="background:${breakdownDir==='expense'?'var(--surface)':'none'};border:none;color:${breakdownDir==='expense'?'var(--text)':'var(--text-muted)'};font-size:12px;font-weight:600;padding:4px 14px;border-radius:6px;cursor:pointer">支出</button>
      <button onclick="setBreakdownDir('income')"  style="background:${breakdownDir==='income' ?'var(--surface)':'none'};border:none;color:${breakdownDir==='income' ?'var(--text)':'var(--text-muted)'};font-size:12px;font-weight:600;padding:4px 14px;border-radius:6px;cursor:pointer">收入</button>
    </div>`

  document.getElementById('panel-account').innerHTML = `
    <div class="card" style="margin-bottom:16px">
      ${toggleHtml}
      <div class="main-donut-wrap"><canvas id="acct-donut"></canvas>
        <div class="main-donut-center">
          <div class="main-donut-total" style="color:${dirColor}">$${sum(pool).toLocaleString()}</div>
          <div class="main-donut-label">${dirLabel}總計</div>
        </div>
      </div>
    </div>
    <div class="card">
      ${sorted.map(([acct, amt], i) => `
        <div class="breakdown-row" style="cursor:pointer" data-drill-type="account" data-drill-key="${escHtml(acct)}" onclick="openDrill(this.dataset.drillType,this.dataset.drillKey)">
          <div class="breakdown-icon" style="background:${ACCT_COLORS[i]||'var(--surface2)'}22;border:2px solid ${ACCT_COLORS[i]||'var(--border)'}">
            <span>${acctIcon(acct)}</span>
          </div>
          <div class="breakdown-info">
            <div class="breakdown-name">${escHtml(acct)}</div>
            <div class="breakdown-sub">${pool.filter(t=>(t.card||'未分類')===acct).length} 筆</div>
          </div>
          <div class="breakdown-right">
            <div class="breakdown-amt" style="color:${dirColor}">$${amt.toLocaleString()}</div>
            <div class="breakdown-pct">${(amt/total*100).toFixed(1)}%</div>
          </div>
        </div>
      `).join('')}
      ${sorted.length===0?`<div style="padding:24px 0;text-align:center;color:var(--text-muted)">此期間無${dirLabel}</div>`:''}
      ${sorted.length>0?`<div class="breakdown-row" style="border-top:1px solid var(--border);margin-top:4px;padding-top:12px">
        <div class="breakdown-info"><div class="breakdown-name" style="font-weight:700">總計</div></div>
        <div class="breakdown-right"><div class="breakdown-amt" style="font-size:16px;color:${dirColor}">$${sum(pool).toLocaleString()}</div></div>
      </div>`:''}
    </div>`

  if (donutData.length) {
    const ctx = document.getElementById('acct-donut').getContext('2d')
    chartByTab.account.push(new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: donutData.map(([c])=>c),
        datasets: [{ data: donutData.map(([,v])=>v), backgroundColor: donutData.map((_,i)=>ACCT_COLORS[i]||'#888'), borderWidth: 2, borderColor: '#161b22' }]
      },
      options: {
        responsive: false,
        cutout: '62%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: $${ctx.raw.toLocaleString()} (${(ctx.raw/total*100).toFixed(1)}%)` } }
        }
      }
    }))
  }
}

// ── 初始化 ──
updatePeriodLabel()
load()

// ── 手機滑動：左右滑動切換期間 ──
if (window.innerWidth <= 768) {
  let _sx = 0, _sy = 0
  const container = document.querySelector('.report-container') || document.querySelector('main') || document.body
  container.addEventListener('touchstart', e => {
    _sx = e.touches[0].clientX
    _sy = e.touches[0].clientY
  }, { passive: true, signal })
  container.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - _sx
    const dy = e.changedTouches[0].clientY - _sy
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      dx < 0 ? nextPeriod() : prevPeriod()
    }
  }, { passive: true, signal })
}
}
