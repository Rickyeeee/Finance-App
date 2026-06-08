// ── Auth ──
const _AUTH_KEY = 'ricky_finance_token'
let _token = localStorage.getItem(_AUTH_KEY)

function _showLogin() {
  let overlay = document.getElementById('__auth_overlay')
  if (overlay) { overlay.style.display = 'flex'; document.getElementById('__auth_pin')?.focus(); return }

  const style = document.createElement('style')
  style.textContent = `
    #__auth_overlay{position:fixed;inset:0;background:#0d1117;display:flex;align-items:center;justify-content:center;z-index:9999;flex-direction:column;gap:16px}
    #__auth_logo{font-size:48px}
    #__auth_title{color:#e6edf3;font-size:20px;font-weight:600;margin:0}
    #__auth_pin{background:#161b22;border:1px solid #30363d;color:#e6edf3;padding:14px 20px;font-size:28px;text-align:center;border-radius:12px;width:180px;letter-spacing:10px;outline:none;font-family:monospace}
    #__auth_pin:focus{border-color:#58a6ff;box-shadow:0 0 0 3px rgba(88,166,255,.15)}
    #__auth_btn{background:#238636;color:#fff;border:none;padding:14px 0;border-radius:8px;font-size:16px;cursor:pointer;width:220px;font-weight:600}
    #__auth_btn:disabled{opacity:.5;cursor:default}
    #__auth_err{color:#f85149;font-size:13px;min-height:18px}
  `
  document.head.appendChild(style)

  overlay = document.createElement('div')
  overlay.id = '__auth_overlay'
  overlay.innerHTML = `
    <div id="__auth_logo">💰</div>
    <div id="__auth_title">瑞奇財務</div>
    <input id="__auth_pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="12">
    <button id="__auth_btn" onclick="window.__authLogin()">確認</button>
    <div id="__auth_err"></div>
  `
  document.body.appendChild(overlay)

  document.getElementById('__auth_pin').addEventListener('keydown', e => {
    if (e.key === 'Enter') window.__authLogin()
  })
  setTimeout(() => document.getElementById('__auth_pin')?.focus(), 100)
}

window.__authLogin = async function () {
  const pin = document.getElementById('__auth_pin').value.trim()
  const errEl = document.getElementById('__auth_err')
  const btn = document.getElementById('__auth_btn')
  if (!pin) return
  btn.disabled = true
  btn.textContent = '驗證中…'
  errEl.textContent = ''
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    const data = await res.json()
    if (data.ok) {
      _token = data.token
      localStorage.setItem(_AUTH_KEY, _token)
      window.location.reload()
    } else {
      errEl.textContent = '密碼錯誤，請重試'
      document.getElementById('__auth_pin').value = ''
      document.getElementById('__auth_pin').focus()
    }
  } catch {
    errEl.textContent = '連線失敗，請稍後再試'
  } finally {
    btn.disabled = false
    btn.textContent = '確認'
  }
}

;(function initAuth() {
  function check() { if (!_token) _showLogin() }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check)
  } else {
    check()
  }
})()

// ── API request ──
const BASE = '/api'

async function request(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
      ...opts.headers,
    },
    ...opts,
  })
  if (res.status === 401) {
    _token = null
    localStorage.removeItem(_AUTH_KEY)
    _showLogin()
    return { ok: false, error: '未授權' }
  }
  return res.json()
}

export const api = {
  // Transactions
  getTransactions: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined && v !== '')))
    return request('/transactions?' + q)
  },
  addTransaction: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id, data) => request('/transactions/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTransaction: (id) => request('/transactions/' + id, { method: 'DELETE' }),
  addTransfer: (data) => request('/transactions/transfer', { method: 'POST', body: JSON.stringify(data) }),
  updateTransfer: (transferId, data) => request('/transactions/transfer/' + transferId, { method: 'PATCH', body: JSON.stringify(data) }),

  // Assets
  getAssets: () => request('/assets'),
  addAsset: (data) => request('/assets', { method: 'POST', body: JSON.stringify(data) }),
  updateAsset: (id, data) => request('/assets/' + id, { method: 'PATCH', body: JSON.stringify(typeof data === 'number' ? { balance: data } : data) }),
  deleteAsset: (id) => request('/assets/' + id, { method: 'DELETE' }),
  getAssetHistory: (months = 12) => request('/assets/history?months=' + months),
  takeSnapshot: () => request('/assets/snapshot', { method: 'POST' }),

  // Investments
  getInvestments: () => request('/investments'),
  updateInvestment: (id, data) => request('/investments/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  uploadInvestmentCSV: (formData) => fetch(BASE + '/investments/upload', {
    method: 'POST',
    headers: _token ? { Authorization: `Bearer ${_token}` } : {},
    body: formData,
  }).then(r => r.json()),
  refreshInvestmentPrice: (symbol) => request('/investments/price/' + symbol + '/refresh', { method: 'POST' }),
  refreshAllInvestmentPrices: () => request('/investments/refresh-all', { method: 'POST' }),
  lookupStock: (symbol) => request('/investments/lookup/' + symbol),
  getInvestmentHistory: (range) => request('/investments/history?range=' + range),
  getInvestmentTrades: (symbol) => request('/investments/trades' + (symbol ? '?symbol=' + symbol : '')),
  addInvestmentTrade: (data) => request('/investments/trades', { method: 'POST', body: JSON.stringify(data) }),
  updateInvestmentTrade: (id, data) => request('/investments/trades/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteInvestmentTrade: (id) => request('/investments/trades/' + id, { method: 'DELETE' }),

  // Summary
  getDailySummary: (date) => request('/summary/daily' + (date ? '?date=' + date : '')),
  getMonthlySummary: (month) => request('/summary/monthly' + (month ? '?month=' + month : '')),

  // Reconcile
  getReconcile: (month) => request('/reconcile' + (month ? '?month=' + month : '')),
  uploadBill: (data) => request('/reconcile/upload', { method: 'POST', body: JSON.stringify(data) }),
  updateReconcile: (id, data) => request('/reconcile/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deferReconcile: (id, new_date) => request('/reconcile/' + id + '/defer', { method: 'POST', body: JSON.stringify({ new_date }) }),
  addPayment: (data) => request('/reconcile/payment', { method: 'POST', body: JSON.stringify(data) }),

  // Gmail
  syncGmail: () => request('/gmail/sync', { method: 'POST' }),
  getGmailOAuthUrl: () => request('/gmail/oauth/url'),

  // Categories
  getCategories: () => request('/categories'),
  addCategory: (name, type, sort_order) => request('/categories', { method: 'POST', body: JSON.stringify({ name, type, sort_order }) }),
  updateCategory: (id, data) => request('/categories/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCategory: (id) => request('/categories/' + id, { method: 'DELETE' }),
  fixCategoryRecords: () => request('/categories/fix-records', { method: 'POST' }),

  // Recurring Transactions
  getRecurring: () => request('/recurring'),
  addRecurring: (data) => request('/recurring', { method: 'POST', body: JSON.stringify(data) }),
  updateRecurring: (id, data) => request('/recurring/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRecurring: (id) => request('/recurring/' + id, { method: 'DELETE' }),
  processRecurring: () => request('/recurring/process', { method: 'POST' }),
}

// ── Toast notifications ──
export function toast(message, type = 'success') {
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    container.className = 'toast-container'
    document.body.appendChild(container)
  }
  const el = document.createElement('div')
  el.className = `toast ${type}`
  el.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span><span>${message}</span>`
  container.appendChild(el)
  setTimeout(() => el.remove(), 4000)
}

// ── Format helpers ──
export function formatMoney(n) {
  if (n === null || n === undefined) return '–'
  return 'NT$' + Math.abs(n).toLocaleString()
}

export function fmtSigned(amount, type) {
  if (amount === null || amount === undefined) return '–'
  const signed = type === '收入' ? amount : -Math.abs(amount)
  return (signed >= 0 ? '+' : '-') + '$' + Math.abs(signed).toLocaleString()
}

export function amtColor(type) {
  return type === '收入' ? 'var(--success)' : 'var(--danger)'
}

export function formatDate(str) {
  if (!str) return '–'
  const d = new Date(str)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}

export function formatReturn(rate) {
  const prefix = rate >= 0 ? '+' : ''
  return prefix + rate.toFixed(2) + '%'
}

export function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
}

export function badgeHtml(status) {
  return `<span class="badge badge-${status}">${status}</span>`
}

// ── Category icons ──
const CAT_ICON_MAP = {
  '餐飲':'🍜','餐廳':'🍽️','外食':'🍱','飲食':'🥡','飲料':'🧋','咖啡':'☕','早餐':'🥞','午餐':'🥘','晚餐':'🍲',
  '交通':'🚇','捷運':'🚇','公車':'🚌','計程車':'🚕','停車':'🅿️','加油':'⛽','Uber':'🚗','高鐵':'🚅',
  '購物':'🛍️','衣物':'👔','服飾':'👗','網購':'📦','百貨':'🏬',
  '娛樂':'🎮','電影':'🎬','音樂':'🎵','遊戲':'🎯','KTV':'🎤',
  '醫療':'💊','健康':'🏥','藥局':'💊','看診':'🩺',
  '房租':'🏠','水電':'💡','瓦斯':'🔥','網路':'📡','住宿':'🛏️',
  '訂閱':'📱','軟體':'💻','App':'📲','Netflix':'🎬','Spotify':'🎵','Disney':'🎬',
  '教育':'📚','書籍':'📖','課程':'🎓','文具':'✏️',
  '旅遊':'✈️','飯店':'🏨','景點':'🗺️',
  '保險':'🛡️',
  '美容':'💄','美髮':'✂️','保養':'🧴',
  '寵物':'🐾',
  '禮品':'🎁','禮物':'🎁',
  '運動':'🏃','健身':'🏋️',
  '超商':'🏪','全家':'🏪','7-11':'🏪','萊爾富':'🏪',
  '薪資':'💰','薪水':'💰','獎金':'🎉',
  '投資':'📈','股票':'📊','基金':'💹','配息':'💹',
  '租金收入':'🏠','副業':'💼',
  '轉帳':'💸','還款':'💸',
  '其他':'📦',
}

export function catIcon(name) {
  if (!name) return '📦'
  const key = Object.keys(CAT_ICON_MAP).find(k => name.includes(k))
  return key ? CAT_ICON_MAP[key] : '📦'
}

export function catIconHtml(category, size = 36) {
  const icon = catIcon(category)
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.5)}px;flex-shrink:0">${icon}</div>`
}

export function freqLabel(freq, day) {
  if (freq === 'weekly') return '每週'
  if (freq === 'yearly') return '每年'
  return `每月 ${day} 日`
}

// ── Modal helpers ──
export function openModal(id) { document.getElementById(id).classList.add('open') }
export function closeModal(id) { document.getElementById(id).classList.remove('open') }

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open')
  }
})

export function confirm(message) {
  return window.confirm(message)
}
