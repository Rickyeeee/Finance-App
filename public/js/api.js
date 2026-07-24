// ── Service Worker ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

// ── 防止 modal 開啟時背景滾動（iOS fix）──
;(function() {
  let _scrollY = 0
  function lockBody() {
    _scrollY = window.scrollY
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.height = '100%'
  }
  function unlockBody() {
    document.documentElement.style.overflow = ''
    document.documentElement.style.height = ''
    window.scrollTo(0, _scrollY)
  }
  function checkModals() {
    const anyOpen = !!document.querySelector('.modal-overlay.open, .modal-overlay[style*="flex"], .modal-overlay[style*="block"], #rec-modal.open, #acct-view-modal.open, #stm-wizard.open')
    anyOpen ? lockBody() : unlockBody()
  }
  // 切頁時 router 會強制關掉殘留的浮動視窗，這裡的 _scrollY 記的是「開視窗當下」
  // 的舊頁面捲動位置，是非同步的 MutationObserver 才會觸發 unlockBody() 把它還原——
  // 順序上會晚於 router 自己呼叫的 scrollTo(0,0)，結果把新頁面的捲動位置蓋回舊的、
  // 導致「切頁後沒有真的在最上面」。router 切頁時改呼叫這個，先把 _scrollY 歸零，
  // 之後 unlockBody() 就算晚一步觸發也只會 scrollTo(0,0)，不會蓋掉正確的位置
  window.__resetScrollLock = function() {
    _scrollY = 0
    document.documentElement.style.overflow = ''
    document.documentElement.style.height = ''
    document.body.style.overflow = ''
  }
  // 只在真的跟 modal 開關有關的 mutation 才做事，不要每次 body 底下任何 class/style
  // 變動（切頁時的 nav active、txn-row 的 hover class...）都整個重掃一次，避免造成卡頓
  const observer = new MutationObserver(mutations => {
    checkModals()
    for (const m of mutations) {
      if (m.attributeName !== 'class') continue
      const el = m.target
      if (el instanceof Element && el.classList.contains('modal-overlay')) _trackModalOpenState(el)
    }
  })
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'style'] })
  })
})()

// ── 保證關閉浮動視窗一定是瞬間（跟上面 CSS 的 .closing 規則搭配）──
// 直接關 class="open" 理論上該是瞬間，但編輯消費紀錄視窗裡有些子元素
// （支出/收入/轉帳切換鈕）自己有 transition，關閉當下可能被牽連造成殘影或卡頓，
// 所以關閉時先暫時關掉視窗內所有 transition/animation，關完再還原，
// 這樣不管是什麼元素在動都不會影響「瞬間關閉」
window.__closeModalInstant = function(modalId) {
  const modal = document.getElementById(modalId)
  if (!modal) return
  modal.classList.add('closing')
  modal.classList.remove('open')
  void modal.offsetHeight // 強制 reflow，確保上面兩個 class 變動同一幀生效
  requestAnimationFrame(() => modal.classList.remove('closing'))
}

// ── Modal 表單變更追蹤：ESC 關閉「編輯中」的表單時要先問是否儲存 ──
const _modalFormSnapshot = new WeakMap()
const _knownOpenModals = new WeakSet()
// 只有這幾個是「編輯表單」型的 modal，才需要判斷有沒有改動；其餘（新增帳戶、分類管理…）維持原本直接關閉
const _MODAL_SAVE_FN = {
  'shared-txn-modal': '__stm_save',
  'shared-transfer-modal': '__stm_xfr_save',
  'txn-modal': 'saveTxn',
  'transfer-modal': 'saveTransfer',
}

function _serializeModalForm(modal) {
  const fields = modal.querySelectorAll('input, select, textarea')
  return Array.from(fields).map(f => f.id + '=' + (f.type === 'checkbox' ? f.checked : f.value)).join('|')
}

function _trackModalOpenState(modal) {
  const isOpen = modal.classList.contains('open')
  if (isOpen && !_knownOpenModals.has(modal)) {
    _knownOpenModals.add(modal)
    _modalFormSnapshot.set(modal, _serializeModalForm(modal))
  } else if (!isOpen && _knownOpenModals.has(modal)) {
    _knownOpenModals.delete(modal)
  }
}

// ── Esc 關閉目前開啟的 modal（全站通用，跟上面 checkModals 用同一組選擇器）──
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return
  document.querySelectorAll('.modal-overlay.open, #rec-modal.open, #acct-view-modal.open, #stm-wizard.open').forEach(m => {
    const saveFnName = _MODAL_SAVE_FN[m.id]
    if (saveFnName) {
      const before = _modalFormSnapshot.get(m)
      const now = _serializeModalForm(m)
      if (before !== undefined && before !== now) {
        if (confirm('有未儲存的變更，是否要儲存？')) { window[saveFnName]?.(); return }
      }
    }
    m.classList.remove('open')
  })
})

// ── App config（公開，不需 token）──
let _appName = null
const _APP_NAME_KEY = 'finance_app_name_' + location.hostname.replace(/[^a-z0-9]/gi, '').slice(-12)

function _applyAppName(name) {
  const pagePart = document.title.split(' — ')[0]
  document.title = pagePart ? `${pagePart} — ${name}` : name
  const logoSpan = document.querySelector('.sidebar-logo span:last-child')
  if (logoSpan) logoSpan.textContent = name
  const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
  if (meta) meta.content = name
}

export async function initAppName() {
  try {
    const cached = localStorage.getItem(_APP_NAME_KEY)
    if (cached) _applyAppName(cached)

    const res = await fetch('/api/app-config')
    const data = await res.json()
    _appName = data.app_name || '我的財務'
    localStorage.setItem(_APP_NAME_KEY, _appName)
    _applyAppName(_appName)
  } catch { /* 靜默失敗，保留預設值 */ }
}

// ── Auth ──
const _AUTH_KEY = 'finance_token_' + location.hostname.replace(/[^a-z0-9]/gi, '').slice(-12)
let _token = localStorage.getItem(_AUTH_KEY)
let _loginPending = false

async function _showLogin() {
  if (_loginPending) return
  let overlay = document.getElementById('__auth_overlay')
  if (overlay) { overlay.style.display = 'flex'; document.getElementById('__auth_pin')?.focus(); return }
  _loginPending = true

  let appName = '我的財務'
  try {
    const r = await fetch('/api/app-config')
    const d = await r.json()
    appName = d.app_name || appName
  } catch(e) {}

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
    <div id="__auth_title">${appName}</div>
    <input id="__auth_pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="12">
    <button id="__auth_btn" onclick="window.__authLogin()">確認</button>
    <div id="__auth_err"></div>
  `
  document.body.appendChild(overlay)
  _loginPending = false

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
async function request(path, opts = {}) {
  const res = await fetch('/api' + path, {
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
  getTransaction: (id) => request('/transactions/' + id),
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

  // Investments
  getInvestments: () => request('/investments'),
  updateInvestment: (id, data) => request('/investments/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  refreshAllInvestmentPrices: () => request('/investments/refresh-all', { method: 'POST' }),
  lookupStock: (symbol) => request('/investments/lookup/' + symbol),
  getInvestmentHistory: (range) => request('/investments/history?range=' + range),
  getInvestmentTrades: (symbol) => request('/investments/trades' + (symbol ? '?symbol=' + symbol : '')),
  getInvestmentPnl: () => request('/investments/pnl'),
  addInvestmentTrade: (data) => request('/investments/trades', { method: 'POST', body: JSON.stringify(data) }),
  updateInvestmentTrade: (id, data) => request('/investments/trades/' + id, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteInvestmentTrade: (id) => request('/investments/trades/' + id, { method: 'DELETE' }),

  // Reconcile
  uploadBill: (data) => request('/reconcile/upload', { method: 'POST', body: JSON.stringify(data) }),
  addPayment: (data) => request('/reconcile/payment', { method: 'POST', body: JSON.stringify(data) }),

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
  generateRecurring: (id, until_date) => request('/recurring/' + id + '/generate', { method: 'POST', body: JSON.stringify(until_date ? { until_date } : {}) }),
  generateRecurringOnce: (id, date) => request('/recurring/' + id + '/generate', { method: 'POST', body: JSON.stringify({ only_date: date }) }),
  updateRecurringTemplate: (id, data) => request('/recurring/' + id + '/template', { method: 'PATCH', body: JSON.stringify(data) }),
  updateRecurringFuture: (id, data) => request('/recurring/' + id + '/future', { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRecurring: (id) => request('/recurring/' + id, { method: 'DELETE' }),
  terminateRecurring: (id) => request('/recurring/' + id + '/terminate', { method: 'DELETE' }),
  processRecurring: () => request('/recurring/process', { method: 'POST' }),
  getRecurringTransactions: (id) => request('/recurring/' + id + '/transactions'),
}

// ── System Update ──
export function openUpdateModal() {
  const isInstalled = !location.hostname.includes('ke877857')

  if (document.getElementById('__update_overlay')) {
    document.getElementById('__update_overlay').style.display = 'flex'
    // 重新填入目前名稱
    const cached = localStorage.getItem(_APP_NAME_KEY)
    if (cached) document.getElementById('__settings_name_input').value = cached
    return
  }

  const style = document.createElement('style')
  style.textContent = `
    #__update_overlay{position:fixed;inset:0;background:rgba(1,4,9,.85);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;box-sizing:border-box}
    #__update_box{background:#161b22;border:1px solid #30363d;border-radius:16px;padding:28px 24px;width:100%;max-width:420px}
    #__update_title{color:#e6edf3;font-size:18px;font-weight:700;margin:0 0 20px}
    #__settings_section{margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #30363d}
    #__settings_section label{display:block;font-size:12px;font-weight:600;color:#8b949e;margin-bottom:8px}
    #__settings_name_input{width:100%;background:#0d1117;border:1px solid #30363d;color:#e6edf3;padding:10px 14px;font-size:15px;border-radius:8px;outline:none;font-family:inherit;box-sizing:border-box}
    #__settings_name_input:focus{border-color:#58a6ff}
    #__settings_name_row{display:flex;gap:8px;margin-top:8px}
    #__settings_name_btn{background:#238636;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
    #__settings_name_btn:disabled{opacity:.5;cursor:default}
    #__settings_name_msg{font-size:12px;margin-top:6px;min-height:16px}
    #__update_section label{display:block;font-size:12px;font-weight:600;color:#8b949e;margin-bottom:8px}
    #__update_log{background:#0d1117;border:1px solid #21262d;border-radius:8px;padding:12px;min-height:80px;max-height:160px;overflow-y:auto;font-size:12px;font-family:monospace;color:#8b949e;margin-bottom:12px;display:none}
    #__update_log .ok{color:#3fb950}
    #__update_log .err{color:#f85149}
    #__update_log .step{color:#58a6ff}
    #__update_actions{display:flex;gap:10px}
    #__update_btn{flex:1;background:#21262d;color:#e6edf3;border:1px solid #30363d;padding:10px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer}
    #__update_btn:hover{background:#30363d}
    #__update_btn:disabled{opacity:.5;cursor:default}
    #__update_cancel{background:transparent;color:#8b949e;border:1px solid #30363d;padding:10px 16px;border-radius:8px;font-size:14px;cursor:pointer}
    #__update_cancel:hover{border-color:#8b949e}
  `
  document.head.appendChild(style)

  const currentName = localStorage.getItem(_APP_NAME_KEY) || '我的財務'

  const overlay = document.createElement('div')
  overlay.id = '__update_overlay'
  overlay.innerHTML = `
    <div id="__update_box">
      <div id="__update_title">⚙️ 設定</div>
      <div id="__settings_section">
        <label>系統名稱</label>
        <input id="__settings_name_input" type="text" value="${currentName.replace(/"/g, '&quot;')}" maxlength="30" placeholder="例：我的財務">
        <div id="__settings_name_msg"></div>
        <div id="__settings_name_row">
          <button id="__settings_name_btn" onclick="window.__saveAppName()">儲存名稱</button>
        </div>
      </div>
      ${isInstalled ? `
      <div id="__update_section">
        <label>系統更新</label>
        <div id="__update_log"></div>
        <div id="__update_actions">
          <button id="__update_cancel" onclick="document.getElementById('__update_overlay').style.display='none'">關閉</button>
          <button id="__update_btn" onclick="window.__runUpdate(true)">↑ 更新系統</button>
        </div>
      </div>` : `
      <div id="__update_actions">
        <button id="__update_cancel" onclick="document.getElementById('__update_overlay').style.display='none'" style="flex:1;background:transparent;color:#8b949e;border:1px solid #30363d;padding:10px 16px;border-radius:8px;font-size:14px;cursor:pointer">關閉</button>
      </div>`}
    </div>
  `
  document.body.appendChild(overlay)
}

window.__saveAppName = async function() {
  const input = document.getElementById('__settings_name_input')
  const msg = document.getElementById('__settings_name_msg')
  const btn = document.getElementById('__settings_name_btn')
  const name = input.value.trim()
  if (!name) { msg.style.color = '#f85149'; msg.textContent = '名稱不能為空'; return }
  btn.disabled = true
  btn.textContent = '儲存中…'
  msg.textContent = ''
  try {
    const res = await fetch('/api/app-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
      body: JSON.stringify({ app_name: name }),
    })
    const data = await res.json()
    if (data.ok) {
      _appName = name
      localStorage.setItem(_APP_NAME_KEY, name)
      _applyAppName(name)
      msg.style.color = '#3fb950'
      msg.textContent = '✓ 已儲存'
    } else {
      msg.style.color = '#f85149'
      msg.textContent = data.error || '儲存失敗'
    }
  } catch {
    msg.style.color = '#f85149'
    msg.textContent = '連線失敗'
  } finally {
    btn.disabled = false
    btn.textContent = '儲存名稱'
  }
}

window.__runUpdate = async function(isInstalled) {
  const log = document.getElementById('__update_log')
  const btn = document.getElementById('__update_btn')

  log.style.display = 'block'
  log.innerHTML = ''
  btn.disabled = true
  btn.textContent = '更新中…'
  document.getElementById('__update_cancel').style.display = 'none'

  const addLog = (text, cls = '') => {
    const el = document.createElement('div')
    el.className = cls
    el.textContent = text
    log.appendChild(el)
    log.scrollTop = log.scrollHeight
  }

  try {
    let res
    if (isInstalled) {
      // 朋友的 Worker：直接呼叫自己的 /api/self-update
      addLog('取得最新版本…', 'step')
      res = await fetch('/api/self-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${_token}` },
        body: JSON.stringify({}),
      })
    } else {
      addLog('此頁面不支援一鍵更新', 'err')
      btn.disabled = false
      btn.textContent = '關閉'
      btn.onclick = () => document.getElementById('__update_overlay').style.display = 'none'
      document.getElementById('__update_cancel').style.display = ''
      return
    }

    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const parts = buf.split('\n\n')
      buf = parts.pop()
      for (const part of parts) {
        const eventMatch = part.match(/^event: (\w+)/)
        const dataMatch = part.match(/^data: (.+)/m)
        if (!eventMatch || !dataMatch) continue
        const ev = eventMatch[1]
        const d = JSON.parse(dataMatch[1])
        if (ev === 'step') addLog('⏳ ' + d.message, 'step')
        else if (ev === 'done') addLog('✓ ' + d.message, 'ok')
        else if (ev === 'error') { addLog('✗ ' + d.message, 'err'); btn.disabled = false; btn.textContent = '重試'; document.getElementById('__update_cancel').style.display = ''; return }
        else if (ev === 'complete') {
          addLog('✓ ' + d.message, 'ok')
          btn.disabled = false
          btn.textContent = '完成，重新整理'
          btn.onclick = () => location.reload()
          document.getElementById('__update_cancel').style.display = ''
        }
      }
    }
  } catch(e) {
    addLog('✗ 錯誤：' + e.message, 'err')
    btn.disabled = false
    btn.textContent = '重試'
    document.getElementById('__update_cancel').style.display = ''
  }
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
  setTimeout(() => { el.classList.add('hiding'); setTimeout(() => el.remove(), 200) }, 750)
}

// ── Format helpers ──
export function formatMoney(n) {
  if (n === null || n === undefined) return '–'
  return '$' + Math.abs(n).toLocaleString()
}

export function fmtSigned(amount, type) {
  if (amount === null || amount === undefined) return '–'
  return '$' + Math.abs(amount).toLocaleString()
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
  return Math.abs(rate).toFixed(2) + '%'
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

// 只在 mousedown 也在 overlay 上（非從 modal 內拖出）才關閉
let _overlayMousedownTarget = null
document.addEventListener('mousedown', (e) => {
  _overlayMousedownTarget = e.target
})
document.addEventListener('click', (e) => {
  if (
    e.target.classList.contains('modal-overlay') &&
    _overlayMousedownTarget === e.target
  ) {
    e.target.classList.remove('open')
  }
})

export function confirm(message) {
  return window.confirm(message)
}

// ── SWR 快取（sessionStorage）──
// 用法：先拿快取馬上渲染，背景拉新資料再更新
export const swr = {
  get(key) {
    try { const v = sessionStorage.getItem('swr:' + key); return v ? JSON.parse(v) : null } catch { return null }
  },
  set(key, data) {
    try { sessionStorage.setItem('swr:' + key, JSON.stringify(data)) } catch {}
  },
  delete(key) {
    try { sessionStorage.removeItem('swr:' + key) } catch {}
  },
}

// ── 開機畫面（splash）──
// 只有 overview.js 會主動關閉，若從 /add 等其他頁面直接進站，splash 永遠不會被關掉、
// 畫面卡死在啟動動畫——改成 router 每次切頁都保底呼叫一次，不管進站頁面是誰都會關
export function hideSplash() {
  const s = document.getElementById('splash')
  if (!s || s.classList.contains('hide')) return
  s.classList.add('hide')
  setTimeout(() => s.remove(), 400)
}

// ── 背景預載 txn-modal（頁面模組與資料的預載由 router.js 負責）──
;(function () {
  const idle = 'requestIdleCallback' in window ? f => requestIdleCallback(f, { timeout: 2000 }) : f => setTimeout(f, 800)
  idle(() => { import('/js/txn-modal.js').catch(() => {}) })
})()


