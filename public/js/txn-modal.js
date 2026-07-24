/**
 * 共用新增/編輯交易 Modal
 * 支援：支出 / 收入 / 轉帳
 * 用法：
 *   import { openAddTxnModal, openEditTxnModal } from '/js/txn-modal.js'
 *   openAddTxnModal({ prefillCard, prefillDate, onSave })
 *   openEditTxnModal(txn, { onSave, onDelete })
 */

import { api, toast } from '/js/api.js'

let _allAccounts = []
let _allCategories = []
let _currentType = '支出'
let _onSave = null
let _onDelete = null
let _editScope = 'this'   // 'this' | 'all' | 'future'
let _editTxn = null       // 目前正在編輯的交易原始物件

// ── 注入 Modal HTML ──────────────────────────────────────
function injectModal() {
  if (document.getElementById('shared-txn-modal')) return
  // 定期修改範圍選擇器
  if (!document.getElementById('shared-scope-modal')) {
    const el = document.createElement('div')
    el.innerHTML = `
<div class="modal-overlay" id="shared-scope-modal">
  <div class="modal" style="max-width:340px">
    <div class="modal-header">
      <div class="modal-title">修改定期紀錄</div>
      <button class="modal-close" onclick="window.__stm_closeScope()">×</button>
    </div>
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px" id="shared-scope-txn-name"></div>
    <div style="display:flex;flex-direction:column;gap:10px;padding-bottom:4px">
      <button class="btn btn-secondary" style="width:100%;text-align:left;padding:12px 14px" onclick="window.__stm_pickScope('this')">
        <div style="font-weight:600;margin-bottom:2px">修改此記錄</div>
        <div style="font-size:12px;color:var(--text-muted)">只更動這一筆，不影響其他</div>
      </button>
      <button class="btn btn-secondary" style="width:100%;text-align:left;padding:12px 14px" onclick="window.__stm_pickScope('future')">
        <div style="font-weight:600;margin-bottom:2px">修改連同未來週期</div>
        <div style="font-size:12px;color:var(--text-muted)">這筆及之後同週期的紀錄一起更新</div>
      </button>
    </div>
  </div>
</div>`.trim()
    document.body.appendChild(el.firstElementChild)
  }

  // 定期刪除範圍選擇器
  if (!document.getElementById('shared-delete-scope-modal')) {
    const el = document.createElement('div')
    el.innerHTML = `
<div class="modal-overlay" id="shared-delete-scope-modal">
  <div class="modal" style="max-width:380px">
    <div class="modal-header">
      <div class="modal-title">刪除紀錄</div>
      <button class="modal-close" onclick="window.__stm_closeDeleteScope()">×</button>
    </div>
    <div style="padding:4px 0 8px">
      <button onclick="window.__stm_doDelete('this')" style="display:block;width:100%;text-align:left;padding:16px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;margin-bottom:10px;cursor:pointer;color:var(--text)">
        <div style="font-weight:600;font-size:14px;margin-bottom:4px">刪除此筆紀錄</div>
        <div style="font-size:12px;color:var(--text-muted)">只刪除這一筆，定期設定及其他紀錄不受影響</div>
      </button>
      <button onclick="window.__stm_doDelete('terminate')" style="display:block;width:100%;text-align:left;padding:16px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;cursor:pointer;color:var(--text)">
        <div style="font-weight:600;font-size:14px;margin-bottom:4px;color:var(--danger)">終止未來週期</div>
        <div style="font-size:12px;color:var(--text-muted)">刪除此筆及所有尚未確認的未來交易，歷史已對帳紀錄保留</div>
      </button>
    </div>
  </div>
</div>`.trim()
    document.body.appendChild(el.firstElementChild)
  }
  const el = document.createElement('div')
  el.innerHTML = `
<div class="modal-overlay" id="shared-txn-modal">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title" id="shared-modal-title">新增支出</div>
      <button class="modal-close" onclick="window.__stm_close()">×</button>
    </div>
    <input type="hidden" id="shared-edit-id">
    <div class="type-toggle">
      <button id="shared-btn-expense" class="active-expense" onclick="window.__stm_setType('支出')">支出</button>
      <button id="shared-btn-income" onclick="window.__stm_setType('收入')">收入</button>
      <button id="shared-btn-transfer" onclick="window.__stm_setType('轉帳')">↔ 轉帳</button>
    </div>

    <!-- 支出 / 收入 欄位 -->
    <div id="shared-fields-normal">
      <div class="form-group">
        <label class="form-label">日期 *</label>
        <input type="date" id="shared-f-date">
      </div>
      <div class="form-group">
        <label class="form-label">分類</label>
        <select id="shared-f-category"></select>
      </div>
      <div class="form-group">
        <label class="form-label">金額 ($) *</label>
        <input type="number" id="shared-f-amount" placeholder="0" class="calc-input" oninput="window.__stm_updateTotal()">
      </div>
      <div id="shared-fee-section" style="display:none">
        <div class="form-group" style="margin-bottom:4px">
          <label class="form-label">手續費 ($)</label>
          <input type="number" id="shared-f-fee" placeholder="0" class="calc-input" oninput="window.__stm_updateTotal()">
        </div>
        <div id="shared-fee-total" style="font-size:12px;color:var(--text-muted);padding:0 0 8px;font-weight:500"></div>
      </div>
      <button type="button" id="shared-fee-toggle" onclick="window.__stm_toggleFee()" style="background:none;border:none;color:var(--accent);font-size:12px;cursor:pointer;padding:0 0 10px;font-family:inherit;text-align:left;display:block">＋ 加入手續費</button>
      <div class="form-group">
        <label class="form-label">名稱 <span style="color:var(--text-muted);font-weight:400;font-size:11px">選填</span></label>
        <input type="text" id="shared-f-name" placeholder="例：全家、薪資">
      </div>
      <div class="form-group">
        <label class="form-label">帳戶</label>
        <select id="shared-f-card"></select>
      </div>
    </div>

    <!-- 轉帳欄位 -->
    <div id="shared-fields-transfer" style="display:none">
      <div style="background:rgba(88,166,255,0.06);border:1px solid rgba(88,166,255,0.2);border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:12px;color:var(--text-muted)">
        同時建立兩筆關聯記錄：來源帳戶的支出 + 目標帳戶的收入
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">來源帳戶 *</label>
          <select id="shared-f-xfr-from"></select>
        </div>
        <div class="form-group">
          <label class="form-label">目標帳戶 *</label>
          <select id="shared-f-xfr-to"></select>
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">金額 ($) *</label>
          <input type="number" id="shared-f-xfr-amount" placeholder="0" class="calc-input">
        </div>
        <div class="form-group">
          <label class="form-label">日期 *</label>
          <input type="date" id="shared-f-xfr-date">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">備註</label>
        <input type="text" id="shared-f-xfr-note" placeholder="選填">
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn btn-danger" id="shared-delete-btn" style="display:none;margin-right:auto" onclick="window.__stm_delete()">刪除</button>
      <button class="btn btn-secondary" onclick="window.__stm_close()">取消</button>
      <button class="btn btn-primary" onclick="window.__stm_save()">儲存</button>
    </div>
  </div>
</div>`.trim()
  document.body.appendChild(el.firstElementChild)
}

// ── 工具 ────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function groupedAccountOpts(accounts) {
  const TYPE_LABEL = { '銀行':'銀行','銀行存款':'銀行','證券戶':'證券戶','投資帳戶':'證券戶','信用卡':'信用卡','現金':'現金' }
  const groups = {}
  for (const a of accounts) {
    const label = TYPE_LABEL[a.type] ?? a.type
    ;(groups[label] = groups[label] ?? []).push(a)
  }
  const order = ['銀行','信用卡','證券戶','現金']
  // value 用 id：跨類別同名帳戶（如銀行「國泰」+證券戶「國泰」）才不會選錯
  let html = ''
  for (const t of order) {
    if (!groups[t]?.length) continue
    html += `<optgroup label="${t}">${groups[t].map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</optgroup>`
  }
  const known = new Set(order)
  for (const [t, accs] of Object.entries(groups)) {
    if (known.has(t)) continue
    html += `<optgroup label="${t}">${accs.map(a=>`<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</optgroup>`
  }
  return html || '<option>無可用帳戶</option>'
}

function renderCatOpts(type) {
  return _allCategories.filter(c => c.type === type)
    .map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('')
}

async function loadData() {
  if (_allAccounts.length && _allCategories.length) return
  const [aRes, cRes] = await Promise.all([api.getAssets(), api.getCategories()])
  if (aRes.ok) _allAccounts = aRes.data.accounts ?? []
  if (cRes.ok) _allCategories = cRes.data ?? []
}

export function preloadTxnModalData(accounts, categories) {
  if (accounts?.length) _allAccounts = accounts
  if (categories?.length) _allCategories = categories
}

// ── 全域 handlers（onclick 用）────────────────────────────
window.__stm_setType = function(type) {
  _currentType = type
  const isEdit = !!document.getElementById('shared-edit-id').value
  document.getElementById('shared-modal-title').textContent = (isEdit ? '編輯' : '新增') + (type === '轉帳' ? '轉帳' : type)
  document.getElementById('shared-btn-expense').className = type === '支出' ? 'active-expense' : ''
  document.getElementById('shared-btn-income').className = type === '收入' ? 'active-income' : ''
  document.getElementById('shared-btn-transfer').className = type === '轉帳' ? 'active-income' : ''
  document.getElementById('shared-fields-normal').style.display = type === '轉帳' ? 'none' : 'block'
  document.getElementById('shared-fields-transfer').style.display = type === '轉帳' ? 'block' : 'none'
  if (type !== '轉帳') {
    document.getElementById('shared-f-category').innerHTML = renderCatOpts(type)
  } else {
    const opts = groupedAccountOpts(_allAccounts)
    document.getElementById('shared-f-xfr-from').innerHTML = opts
    document.getElementById('shared-f-xfr-to').innerHTML = opts
    if (_allAccounts.length > 1) document.getElementById('shared-f-xfr-to').selectedIndex = 1
  }
}

window.__stm_updateTotal = function() {
  const base = parseInt(document.getElementById('shared-f-amount').value) || 0
  const fee  = parseInt(document.getElementById('shared-f-fee').value)   || 0
  const el = document.getElementById('shared-fee-total')
  el.textContent = (fee > 0 && base > 0)
    ? `$${base.toLocaleString()} + 手續費 $${fee.toLocaleString()} = 合計 $${(base+fee).toLocaleString()}`
    : ''
}

window.__stm_toggleFee = function() {
  const sec = document.getElementById('shared-fee-section')
  const btn = document.getElementById('shared-fee-toggle')
  const open = sec.style.display !== 'none'
  sec.style.display = open ? 'none' : 'block'
  btn.textContent = open ? '＋ 加入手續費' : '－ 移除手續費'
  if (open) { document.getElementById('shared-f-fee').value = ''; document.getElementById('shared-fee-total').textContent = '' }
}

window.__stm_close = function() {
  window.__closeModalInstant('shared-txn-modal')
}

window.__stm_closeScope = function() {
  document.getElementById('shared-scope-modal').classList.remove('open')
}

window.__stm_pickScope = function(scope) {
  _editScope = scope
  window.__stm_closeScope()
  if (scope === 'all') {
    // 修改整個週期事件：直接開週期模板的編輯（不帶 txn id，儲存打 recurring template API）
    _openEditForm(_editTxn, { asTemplate: true })
  } else {
    // 修改此記錄 or 修改連同未來週期：開一般編輯 form
    _openEditForm(_editTxn, { asTemplate: false })
  }
}

window.__stm_save = async function() {
  const id = document.getElementById('shared-edit-id').value

  if (_currentType === '轉帳') {
    const from_account_id = document.getElementById('shared-f-xfr-from').value
    const to_account_id   = document.getElementById('shared-f-xfr-to').value
    const fromObj = _allAccounts.find(a => a.id === from_account_id)
    const toObj   = _allAccounts.find(a => a.id === to_account_id)
    const amount = parseInt(document.getElementById('shared-f-xfr-amount').value)
    const date   = document.getElementById('shared-f-xfr-date').value
    const note   = document.getElementById('shared-f-xfr-note').value.trim() || null
    if (!amount || !date) { toast('請填寫金額和日期', 'error'); return }
    if (from_account_id === to_account_id) { toast('來源與目標帳戶不能相同', 'error'); return }
    const res = await api.addTransfer({
      from_account: fromObj?.name ?? '', to_account: toObj?.name ?? '',
      from_account_id, to_account_id, amount, date, note,
    })
    if (res.ok) { window.__stm_close(); toast('轉帳記錄已建立'); _onSave?.() }
    else toast(res.error ?? '轉帳失敗', 'error')
    return
  }

  const category   = document.getElementById('shared-f-category').value
  const baseAmount = parseInt(document.getElementById('shared-f-amount').value)
  const fee        = parseInt(document.getElementById('shared-f-fee').value) || 0
  const cardId     = document.getElementById('shared-f-card').value
  const acctObj    = _allAccounts.find(a => a.id === cardId)
  const data = {
    name:       document.getElementById('shared-f-name').value.trim() || category,
    amount:     baseAmount + fee,
    date:       document.getElementById('shared-f-date').value,
    category,
    card:       acctObj?.name ?? '',
    account_id: acctObj?.id ?? null,
    type:       _currentType,
    note:       fee > 0 ? `含手續費 $${fee.toLocaleString()}` : null,
  }
  if (!data.amount || !data.date) { toast('請填寫金額和日期', 'error'); return }

  // 定期範圍處理
  if (_editTxn?.recurring_id && _editScope !== 'this') {
    const rid = _editTxn.recurring_id
    // templateData：amount 用本金，fee 分開傳；後端自己算總額給 transactions
    const templateData = { name: data.name, amount: baseAmount, fee, category: data.category, card: data.card, note: data.note }

    if (_editScope === 'all') {
      const res = await api.updateRecurringTemplate(rid, templateData)
      if (res.ok) { window.__stm_close(); toast('週期模板已更新'); _onSave?.() }
      else toast(res.error ?? '更新失敗', 'error')
      return
    }

    if (_editScope === 'future') {
      const [r1, r2] = await Promise.all([
        id ? api.updateTransaction(id, data) : Promise.resolve({ ok: true }),
        api.updateRecurringFuture(rid, { ...templateData, transaction_id: id, from_date: _editTxn.date }),
      ])
      if (r1.ok && r2.ok) { window.__stm_close(); toast('已更新此筆及未來紀錄'); _onSave?.() }
      else toast('部分更新失敗', 'error')
      return
    }
  }

  const res = id
    ? await api.updateTransaction(id, data)
    : await api.addTransaction(data)
  if (res.ok) { window.__stm_close(); toast(id ? '已更新' : '已新增'); _onSave?.() }
  else toast(res.error ?? '操作失敗', 'error')
}

window.__stm_delete = function() {
  if (_editTxn?.recurring_id) {
    document.getElementById('shared-delete-scope-modal').classList.add('open')
  } else {
    if (!confirm('確定要刪除這筆記錄？')) return
    window.__stm_doDelete('single')
  }
}

window.__stm_closeDeleteScope = function() {
  document.getElementById('shared-delete-scope-modal').classList.remove('open')
}

window.__stm_doDelete = async function(scope) {
  window.__stm_closeDeleteScope()
  const id = document.getElementById('shared-edit-id').value
  if (!id) return
  if (scope === 'terminate') {
    const rid = _editTxn?.recurring_id
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
    const [r1, r2] = await Promise.all([
      api.deleteTransaction(id),
      rid ? api.terminateRecurring(rid) : Promise.resolve({ ok: true }),
    ])
    if (r1.ok) { window.__stm_close(); toast('已終止未來週期，歷史紀錄保留'); (_onDelete ?? _onSave)?.() }
    else toast(r1.error ?? '刪除失敗', 'error')
  } else {
    const res = await api.deleteTransaction(id)
    if (res.ok) { window.__stm_close(); toast('已刪除'); (_onDelete ?? _onSave)?.() }
    else toast(res.error ?? '刪除失敗', 'error')
  }
}

// ── Wizard Modal（新增專用）──────────────────────────────
let _wForm = {}
let _wAmtExpr = ''
let _wOnSave = null
let _wPrefillCard = null
let _wPrefillDate = null

const _W_CAT_ICON = {
  '餐飲':'🍜','餐廳':'🍽️','外食':'🍱','飲食':'🥡','飲料':'🧋','咖啡':'☕','早餐':'🥞','午餐':'🥘','晚餐':'🍲',
  '交通':'🚇','捷運':'🚇','公車':'🚌','計程車':'🚕','停車':'🅿️','加油':'⛽','Uber':'🚗','高鐵':'🚅',
  '購物':'🛍️','衣物':'👔','服飾':'👗','網購':'📦','百貨':'🏬',
  '娛樂':'🎮','電影':'🎬','音樂':'🎵','遊戲':'🎯',
  '醫療':'💊','健康':'🏥','藥局':'💊','看診':'🩺',
  '房租':'🏠','水電':'💡','瓦斯':'🔥','網路':'📡','住宿':'🛏️',
  '訂閱':'📱','軟體':'💻','Netflix':'🎬','Spotify':'🎵',
  '教育':'📚','書籍':'📖','課程':'🎓',
  '旅遊':'✈️','飯店':'🏨',
  '保險':'🛡️','美容':'💄','美髮':'✂️','保養':'🧴','寵物':'🐾',
  '禮品':'🎁','禮物':'🎁','運動':'🏃','健身':'🏋️',
  '超商':'🏪','全家':'🏪','7-11':'🏪',
  '薪資':'💰','薪水':'💰','獎金':'🎉',
  '投資':'📈','股票':'📊','基金':'💹','配息':'💹',
  '租金收入':'🏠','副業':'💼','其他':'📦',
}
function _wCatIcon(c) {
  if (c.icon) return c.icon
  const key = Object.keys(_W_CAT_ICON).find(k => c.name.includes(k))
  return key ? _W_CAT_ICON[key] : '📦'
}
function _wEsc(s) { return String(s ?? '').replace(/'/g, "\\'") }

function injectWizardModal() {
  if (document.getElementById('stm-wizard')) return
  if (!document.getElementById('stm-wizard-css')) {
    const s = document.createElement('style')
    s.id = 'stm-wizard-css'
    s.textContent = `
#stm-wizard{position:fixed;inset:0;z-index:1001;background:rgba(0,0,0,.75);display:none;align-items:flex-end;justify-content:center}
#stm-wizard.open{display:flex}
.stm-w-inner{background:#0d1117;width:100%;max-width:480px;height:92vh;height:92svh;border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden;padding-bottom:max(16px,env(safe-area-inset-bottom))}
@media(min-width:769px){#stm-wizard{align-items:center}.stm-w-inner{height:85vh;max-height:700px;border-radius:20px}}
.stm-w-topbar{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;flex-shrink:0}
.stm-w-title{font-size:17px;font-weight:600}
.stm-w-close{background:var(--surface2);border:none;color:var(--text-muted);width:30px;height:30px;border-radius:50%;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent}
.stm-w-dots{display:flex;gap:6px;justify-content:center;padding-bottom:14px;flex-shrink:0}
.stm-w-dot{width:6px;height:6px;border-radius:50%;background:var(--border);transition:all .2s}
.stm-w-dot.active{background:var(--accent);width:18px;border-radius:3px}
.stm-w-dot.done{background:var(--success)}
.stm-w-slides{flex:1;position:relative;overflow:hidden}
.stm-w-slide{position:absolute;inset:0;padding:0 20px 10px;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s cubic-bezier(.25,.46,.45,.94);overflow:hidden;background:#0d1117}
.stm-w-slide.active{transform:translateX(0)}
.stm-w-slide.past{transform:translateX(-100%)}
.stm-w-amt-display{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:4px;min-height:0}
.stm-w-amt-label{font-size:13px;color:var(--text-muted);font-weight:500}
.stm-w-amt-expr{font-size:13px;color:var(--text-muted);min-height:18px;margin-top:2px}
.stm-w-amt-value{font-size:52px;font-weight:300;letter-spacing:-2px;display:flex;align-items:center}
.stm-w-amt-currency{font-size:26px;color:var(--text-muted);margin-right:4px}
.stm-w-amt-value.zero .stm-w-amt-num{color:var(--border)}
.stm-w-calc{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px 0;flex-shrink:0}
.stm-w-ck{background:var(--surface);border:none;color:var(--text);border-radius:12px;font-size:22px;cursor:pointer;height:58px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;user-select:none;font-family:inherit;transition:opacity .08s}
.stm-w-ck:active{opacity:.5}
.stm-w-op{background:var(--surface2);color:#cdd9e5;font-size:20px}
.stm-w-del{background:var(--surface2);color:var(--text-muted);font-size:18px}
.stm-w-clr{background:var(--surface2);color:var(--danger);font-size:16px;font-weight:600}
.stm-w-eq{background:var(--surface2);color:#cdd9e5}
.stm-w-ok{background:var(--accent);color:#0d1117;font-size:20px;font-weight:700}
.stm-w-type-tabs{display:flex;gap:8px;flex-shrink:0;margin-bottom:12px}
.stm-w-type-tab{flex:1;background:var(--surface);border:2px solid var(--border);border-radius:12px;color:var(--text-muted);font-size:15px;font-weight:600;padding:12px 8px;cursor:pointer;text-align:center;-webkit-tap-highlight-color:transparent;font-family:inherit;transition:all .15s}
.stm-w-type-tab.ae{border-color:var(--danger);background:rgba(248,81,73,.1);color:var(--danger)}
.stm-w-type-tab.ai{border-color:var(--success);background:rgba(63,185,80,.1);color:var(--success)}
.stm-w-type-tab.at{border-color:#d07030;background:rgba(208,112,48,.1);color:#d07030}
.stm-w-cat-section{flex:1;overflow:hidden;display:flex;flex-direction:column}
.stm-w-cat-hint{font-size:13px;color:var(--text-muted);margin-bottom:10px;flex-shrink:0}
.stm-w-choose-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;overflow-y:auto;flex:1;padding-bottom:4px;align-content:start}
.stm-w-choose-btn{background:var(--surface);border:2px solid var(--border);border-radius:12px;color:var(--text);font-size:15px;font-weight:500;padding:14px 10px;cursor:pointer;text-align:left;display:flex;align-items:center;gap:8px;-webkit-tap-highlight-color:transparent;font-family:inherit;transition:all .12s}
.stm-w-choose-btn:active{transform:scale(.96)}
.stm-w-choose-btn.selected{border-color:var(--accent);background:rgba(88,166,255,.1);color:var(--accent)}
.stm-w-placeholder{flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px}
.stm-w-step-label{font-size:22px;font-weight:600;margin-bottom:4px;flex-shrink:0}
.stm-w-step-sub{font-size:14px;color:var(--text-muted);margin-bottom:16px;flex-shrink:0}
.stm-w-name-wrap{flex:1;display:flex;flex-direction:column;justify-content:center}
.stm-w-big-input{background:var(--surface);border:1.5px solid var(--border);border-radius:14px;color:var(--text);font-size:18px;padding:16px 18px;width:100%;font-family:inherit;transition:border-color .15s;box-sizing:border-box}
.stm-w-big-input:focus{outline:none;border-color:var(--accent)}
.stm-w-date-input{display:block;width:100%;color-scheme:dark;margin-top:12px}
.stm-w-field-label{font-size:13px;color:var(--text-muted);margin-bottom:6px;font-weight:500;margin-top:14px}
.stm-w-acc-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;overflow-y:auto;flex:1;align-content:start}
.stm-w-acc-group{grid-column:span 2;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;padding:10px 0 4px}
.stm-w-acc-btn{background:var(--surface);border:2px solid var(--border);border-radius:12px;color:var(--text);font-size:15px;font-weight:500;padding:16px 10px;cursor:pointer;text-align:center;-webkit-tap-highlight-color:transparent;font-family:inherit;transition:all .12s}
.stm-w-acc-btn:active{transform:scale(.96)}
.stm-w-acc-btn.selected{border-color:var(--accent);background:rgba(88,166,255,.1);color:var(--accent)}
.stm-w-nav{display:flex;gap:10px;padding:10px 0 0;flex-shrink:0}
.stm-w-btn-back{background:var(--surface);border:1.5px solid var(--border);color:var(--text);border-radius:14px;font-size:15px;font-weight:600;padding:15px 18px;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent}
.stm-w-btn-next{flex:1;background:var(--accent);border:none;color:#0d1117;border-radius:14px;font-size:16px;font-weight:700;padding:15px;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent}
.stm-w-btn-next:disabled{opacity:.35;pointer-events:none}
.stm-w-btn-skip{background:transparent;border:1.5px solid var(--border);color:var(--text-muted);border-radius:14px;font-size:15px;font-weight:500;padding:15px 16px;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent}
.stm-w-success{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;width:100%}
.stm-w-success-icon{font-size:64px}
.stm-w-success-title{font-size:24px;font-weight:700}
.stm-w-success-detail{font-size:15px;color:var(--text-muted);text-align:center}
.stm-w-success-actions{display:flex;flex-direction:column;gap:10px;width:100%;margin-top:36px;align-self:stretch}
.stm-w-btn-again{background:var(--accent);border:none;color:#0d1117;border-radius:14px;font-size:16px;font-weight:700;padding:16px;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent}
.stm-w-btn-done{background:var(--surface);border:1.5px solid var(--border);color:var(--text);border-radius:14px;font-size:16px;font-weight:600;padding:16px;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent}
`
    document.head.appendChild(s)
  }
  const el = document.createElement('div')
  el.innerHTML = `<div id="stm-wizard">
  <div class="stm-w-inner">
    <div class="stm-w-topbar">
      <div class="stm-w-title" id="stm-w-title">新增記錄</div>
      <button class="stm-w-close" onclick="window.__stm_wizard_close()">✕</button>
    </div>
    <div class="stm-w-dots" id="stm-w-dots"></div>
    <div class="stm-w-slides">
      <div class="stm-w-slide active" id="stm-ws1">
        <div class="stm-w-amt-display">
          <div class="stm-w-amt-label">輸入金額</div>
          <div class="stm-w-amt-value zero" id="stm-w-amt">
            <span class="stm-w-amt-currency">$</span>
            <span class="stm-w-amt-num" id="stm-w-amt-num">0</span>
          </div>
          <div class="stm-w-amt-expr" id="stm-w-amt-expr"></div>
        </div>
        <div class="stm-w-calc">
          <button class="stm-w-ck stm-w-op" onclick="window.__stm_wck('÷')">÷</button>
          <button class="stm-w-ck stm-w-op" onclick="window.__stm_wck('×')">×</button>
          <button class="stm-w-ck stm-w-op" onclick="window.__stm_wck('-')">−</button>
          <button class="stm-w-ck stm-w-op" onclick="window.__stm_wck('+')">+</button>
          <button class="stm-w-ck" onclick="window.__stm_wck('7')">7</button>
          <button class="stm-w-ck" onclick="window.__stm_wck('8')">8</button>
          <button class="stm-w-ck" onclick="window.__stm_wck('9')">9</button>
          <button class="stm-w-ck stm-w-del" onclick="window.__stm_wck('⌫')">⌫</button>
          <button class="stm-w-ck" onclick="window.__stm_wck('4')">4</button>
          <button class="stm-w-ck" onclick="window.__stm_wck('5')">5</button>
          <button class="stm-w-ck" onclick="window.__stm_wck('6')">6</button>
          <button class="stm-w-ck stm-w-clr" onclick="window.__stm_wck('C')">C</button>
          <button class="stm-w-ck" onclick="window.__stm_wck('1')">1</button>
          <button class="stm-w-ck" onclick="window.__stm_wck('2')">2</button>
          <button class="stm-w-ck" onclick="window.__stm_wck('3')">3</button>
          <button class="stm-w-ck stm-w-eq" onclick="window.__stm_wck('=')">＝</button>
          <button class="stm-w-ck" onclick="window.__stm_wck('.')">.</button>
          <button class="stm-w-ck" onclick="window.__stm_wck('0')">0</button>
          <button class="stm-w-ck" onclick="window.__stm_wck('00')">00</button>
          <button class="stm-w-ck stm-w-ok" onclick="window.__stm_wck('✓')">✓</button>
        </div>
      </div>
      <div class="stm-w-slide" id="stm-ws2">
        <div class="stm-w-type-tabs">
          <button class="stm-w-type-tab" id="stm-w-tab-e" onclick="window.__stm_wtype('支出')">支出</button>
          <button class="stm-w-type-tab" id="stm-w-tab-i" onclick="window.__stm_wtype('收入')">收入</button>
          <button class="stm-w-type-tab" id="stm-w-tab-t" onclick="window.__stm_wtype('轉帳')">轉帳</button>
        </div>
        <div class="stm-w-cat-section">
          <div class="stm-w-placeholder" id="stm-w-cat-ph">選擇類型後顯示分類</div>
          <div id="stm-w-cat-wrap" style="display:none;flex:1;overflow:hidden;flex-direction:column">
            <div class="stm-w-cat-hint">點選分類後自動進入下一步</div>
            <div class="stm-w-choose-grid" id="stm-w-cat-grid"></div>
          </div>
        </div>
        <div class="stm-w-nav">
          <button class="stm-w-btn-back" onclick="window.__stm_wgo(1)">‹</button>
          <button class="stm-w-btn-next" id="stm-w-s2-next" disabled onclick="window.__stm_wgo(3)">下一步</button>
        </div>
      </div>
      <div class="stm-w-slide" id="stm-ws3">
        <div id="stm-ws3-n" style="flex:1;display:flex;flex-direction:column">
          <div class="stm-w-name-wrap">
            <div class="stm-w-step-label">這筆叫什麼？</div>
            <div class="stm-w-step-sub">選填</div>
            <input class="stm-w-big-input" type="text" id="stm-w-name" placeholder="例：全家、Uber Eats" autocomplete="off" autocorrect="off" spellcheck="false">
            <input type="date" class="stm-w-big-input stm-w-date-input" id="stm-w-date">
          </div>
          <div class="stm-w-nav">
            <button class="stm-w-btn-back" onclick="window.__stm_wgo(2)">‹</button>
            <button class="stm-w-btn-skip" onclick="window.__stm_wgo(4)">跳過</button>
            <button class="stm-w-btn-next" onclick="window.__stm_wgo(4)">下一步</button>
          </div>
        </div>
        <div id="stm-ws3-x" style="display:none;flex:1;flex-direction:column">
          <div class="stm-w-name-wrap">
            <div class="stm-w-step-label">日期與備註</div>
            <div class="stm-w-field-label" style="margin-top:0">日期</div>
            <input type="date" class="stm-w-big-input stm-w-date-input" id="stm-w-xfr-date" style="margin-top:0">
            <div class="stm-w-field-label">備註（選填）</div>
            <input class="stm-w-big-input" type="text" id="stm-w-xfr-note" placeholder="備註" autocomplete="off" style="margin-top:0">
          </div>
          <div class="stm-w-nav">
            <button class="stm-w-btn-back" onclick="window.__stm_wgo(2)">‹</button>
            <button class="stm-w-btn-next" onclick="window.__stm_wgo(4)">下一步</button>
          </div>
        </div>
      </div>
      <div class="stm-w-slide" id="stm-ws4">
        <div id="stm-ws4-a" style="flex:1;display:flex;flex-direction:column">
          <div class="stm-w-step-label">選擇帳戶</div>
          <div class="stm-w-step-sub">點選後送出記錄</div>
          <div class="stm-w-acc-grid" id="stm-w-acc-grid"></div>
          <div class="stm-w-nav"><button class="stm-w-btn-back" onclick="window.__stm_wgo(3)">‹</button></div>
        </div>
        <div id="stm-ws4-f" style="display:none;flex:1;flex-direction:column">
          <div class="stm-w-step-label">轉出帳戶</div>
          <div class="stm-w-step-sub">從哪個帳戶轉出？</div>
          <div class="stm-w-acc-grid" id="stm-w-from-grid"></div>
          <div class="stm-w-nav"><button class="stm-w-btn-back" onclick="window.__stm_wgo(3)">‹</button></div>
        </div>
      </div>
      <div class="stm-w-slide" id="stm-ws5">
        <div class="stm-w-step-label">轉入帳戶</div>
        <div class="stm-w-step-sub" id="stm-w-xfr-from-label">轉入哪個帳戶？</div>
        <div class="stm-w-acc-grid" id="stm-w-to-grid"></div>
        <div class="stm-w-nav"><button class="stm-w-btn-back" onclick="window.__stm_wgo(4)">‹</button></div>
      </div>
      <div class="stm-w-slide" id="stm-ws-ok">
        <div class="stm-w-success">
          <div class="stm-w-success-icon">✅</div>
          <div class="stm-w-success-title">已新增！</div>
          <div class="stm-w-success-detail" id="stm-w-ok-detail"></div>
          <div class="stm-w-success-actions">
            <button class="stm-w-btn-again" onclick="window.__stm_wizard_again()">再新增一筆</button>
            <button class="stm-w-btn-done" onclick="window.__stm_wizard_close()">關閉</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>`.trim()
  document.body.appendChild(el.firstElementChild)
}

function _wRenderDots(n) {
  const el = document.getElementById('stm-w-dots')
  const total = _wForm.type === '轉帳' ? 5 : 4
  if (n === 1) { el.innerHTML = ''; return }
  let h = ''
  for (let i = 2; i <= total; i++) {
    h += `<div class="stm-w-dot ${i < n ? 'done' : i === n ? 'active' : ''}"></div>`
  }
  el.innerHTML = h
}

function _wRenderAccGrid(containerId, fnName, excludeId = null) {
  const TYPE_LABEL = { '銀行':'銀行','銀行存款':'銀行','信用卡':'信用卡','現金':'現金','證券戶':'證券戶','投資帳戶':'證券戶' }
  // 排除用 id，不用名稱——跨類別同名帳戶（如銀行「國泰」+證券戶「國泰」）不該互相排擠
  const list = excludeId ? _allAccounts.filter(a => a.id !== excludeId) : _allAccounts
  const groups = {}
  for (const a of list) {
    const label = TYPE_LABEL[a.type] ?? a.type ?? '其他'
    ;(groups[label] = groups[label] ?? []).push(a)
  }
  const order = ['銀行','信用卡','現金','證券戶']
  const keys = [...order.filter(k => groups[k]), ...Object.keys(groups).filter(k => !order.includes(k))]
  let html = ''
  for (const label of keys) {
    html += `<div class="stm-w-acc-group">${label}</div>`
    html += groups[label].map(a =>
      `<button class="stm-w-acc-btn" data-id="${_wEsc(a.id??'')}" data-name="${_wEsc(a.name)}" onclick="window.${fnName}('${_wEsc(a.id??'')}','${_wEsc(a.name)}')">${a.name}</button>`
    ).join('')
  }
  document.getElementById(containerId).innerHTML = html || '<div style="color:var(--text-muted);grid-column:span 2">尚無帳戶</div>'
}

window.__stm_wck = function(v) {
  if (v === '⌫') { _wAmtExpr = _wAmtExpr.slice(0, -1) }
  else if (v === 'C') { _wAmtExpr = '' }
  else if (v === '=') { const r = _wEval(_wAmtExpr); if (r !== null) _wAmtExpr = String(r) }
  else if (v === '✓') {
    if (_wHasOp(_wAmtExpr)) { const r = _wEval(_wAmtExpr); if (r !== null) { _wAmtExpr = String(r); _wRefreshAmt() } }
    if (_wForm.amount > 0) window.__stm_wgo(2)
    return
  } else if (['+','-','×','÷'].includes(v)) {
    if (!_wAmtExpr) return
    if (/[+\-×÷]$/.test(_wAmtExpr)) _wAmtExpr = _wAmtExpr.slice(0,-1) + v
    else { const r = _wEval(_wAmtExpr); _wAmtExpr = (r!==null ? String(r) : _wAmtExpr) + v }
  } else if (v === '.') {
    const parts = _wAmtExpr.split(/[+\-×÷]/)
    if (!parts[parts.length-1].includes('.')) _wAmtExpr += '.'
  } else if (v === '00') {
    if (_wAmtExpr && !/[+\-×÷]$/.test(_wAmtExpr)) _wAmtExpr += '00'
  } else { _wAmtExpr += v }
  _wRefreshAmt()
}
function _wHasOp(e) { return /[+\-×÷]/.test(e.slice(1)) }
function _wEval(e) {
  if (!e?.trim()) return null
  const safe = e.replace(/×/g,'*').replace(/÷/g,'/')
  if (!/^[\d+\-*/.()\s]+$/.test(safe)) return null
  try { const r = Function('"use strict";return('+safe+')')(); return isFinite(r)&&!isNaN(r) ? Math.round(r*100)/100 : null } catch { return null }
}
function _wRefreshAmt() {
  const num = _wHasOp(_wAmtExpr) ? (_wEval(_wAmtExpr)??0) : (parseFloat(_wAmtExpr)||0)
  document.getElementById('stm-w-amt-num').textContent = num ? num.toLocaleString() : '0'
  document.getElementById('stm-w-amt').className = 'stm-w-amt-value' + (num ? '' : ' zero')
  document.getElementById('stm-w-amt-expr').textContent =
    _wHasOp(_wAmtExpr) ? (_wAmtExpr + ((_wEval(_wAmtExpr)!==null) ? ' = '+_wEval(_wAmtExpr).toLocaleString() : '')) : ''
  _wForm.amount = num
}

window.__stm_wtype = function(type) {
  _wForm.type = type; _wForm.category = ''
  document.getElementById('stm-w-tab-e').className = 'stm-w-type-tab' + (type==='支出'?' ae':'')
  document.getElementById('stm-w-tab-i').className = 'stm-w-type-tab' + (type==='收入'?' ai':'')
  document.getElementById('stm-w-tab-t').className = 'stm-w-type-tab' + (type==='轉帳'?' at':'')
  document.getElementById('stm-w-title').textContent = '新增' + type
  if (type === '轉帳') {
    document.getElementById('stm-w-cat-ph').style.display = 'flex'
    document.getElementById('stm-w-cat-ph').textContent = '轉帳無需選擇分類'
    document.getElementById('stm-w-cat-wrap').style.display = 'none'
    document.getElementById('stm-w-s2-next').disabled = false
  } else {
    const list = _allCategories.filter(c => c.type === type)
    document.getElementById('stm-w-cat-ph').style.display = 'none'
    const wrap = document.getElementById('stm-w-cat-wrap')
    wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'
    document.getElementById('stm-w-s2-next').disabled = true
    document.getElementById('stm-w-cat-grid').innerHTML = list.map(c =>
      `<button class="stm-w-choose-btn" data-name="${_wEsc(c.name)}" onclick="window.__stm_wcat('${_wEsc(c.name)}')">`+
      `<span style="font-size:20px;flex-shrink:0">${_wCatIcon(c)}</span><span>${c.name}</span></button>`
    ).join('') || '<div style="color:var(--text-muted);font-size:14px;padding:20px 0;grid-column:span 2">尚無分類</div>'
  }
}

window.__stm_wcat = function(cat) {
  _wForm.category = cat
  document.querySelectorAll('#stm-w-cat-grid .stm-w-choose-btn').forEach(b =>
    b.classList.toggle('selected', b.dataset.name === cat))
  document.getElementById('stm-w-s2-next').disabled = false
  document.getElementById('stm-w-date').value = _wForm.date
  setTimeout(() => window.__stm_wgo(3), 160)
}

const _W_SLIDES = { 1:'stm-ws1', 2:'stm-ws2', 3:'stm-ws3', 4:'stm-ws4', 5:'stm-ws5', success:'stm-ws-ok' }

window.__stm_wgo = function(n) {
  if (n === 3) {
    const x = _wForm.type === '轉帳'
    document.getElementById('stm-ws3-n').style.display = x ? 'none' : 'flex'
    document.getElementById('stm-ws3-x').style.display = x ? 'flex' : 'none'
    if (!x) document.getElementById('stm-w-date').value = _wForm.date
    else    document.getElementById('stm-w-xfr-date').value = _wForm.date
  }
  if (n === 4) {
    const x = _wForm.type === '轉帳'
    if (!x) {
      _wForm.name = document.getElementById('stm-w-name').value.trim()
      _wForm.date = document.getElementById('stm-w-date').value || _wForm.date
    } else {
      _wForm.note = document.getElementById('stm-w-xfr-note').value.trim()
      _wForm.date = document.getElementById('stm-w-xfr-date').value || _wForm.date
    }
    document.getElementById('stm-ws4-a').style.display = x ? 'none' : 'flex'
    document.getElementById('stm-ws4-f').style.display = x ? 'flex' : 'none'
    if (!x) {
      _wRenderAccGrid('stm-w-acc-grid', '__stm_wSelAcc')
      if (_wPrefillCard) {
        const btn = [...document.querySelectorAll('#stm-w-acc-grid .stm-w-acc-btn')]
          .find(b => b.dataset.name === _wPrefillCard)
        if (btn) { btn.classList.add('selected'); btn.scrollIntoView({ block: 'nearest' }) }
      }
    } else {
      _wRenderAccGrid('stm-w-from-grid', '__stm_wSelFrom')
    }
  }
  if (n === 5) {
    _wRenderAccGrid('stm-w-to-grid', '__stm_wSelTo', _wForm.account_id)
    document.getElementById('stm-w-xfr-from-label').textContent = `從 ${_wForm.card} 轉出`
  }
  Object.entries(_W_SLIDES).forEach(([k, id]) => {
    const el = document.getElementById(id); if (!el) return
    el.classList.remove('active','past')
    if (id === 'stm-ws-ok') return
    const ki = parseInt(k)
    if (!isNaN(ki)) {
      if (n === 'success' || ki < n) el.classList.add('past')
      else if (ki === n) el.classList.add('active')
    }
  })
  if (n === 'success') document.getElementById('stm-ws-ok').classList.add('active')
  if (typeof n === 'number') _wRenderDots(n)
  if (n === 3 && _wForm.type !== '轉帳') setTimeout(() => document.getElementById('stm-w-name').focus(), 350)
}

window.__stm_wSelAcc = async function(id, name) {
  _wForm.card = name; _wForm.account_id = id
  const res = await api.addTransaction({
    name: _wForm.name || _wForm.category, amount: _wForm.amount, date: _wForm.date,
    category: _wForm.category, card: _wForm.card, account_id: _wForm.account_id || undefined,
    type: _wForm.type, status: '待確認', source: '手動輸入',
  })
  if (res.ok) {
    document.getElementById('stm-w-ok-detail').textContent =
      `${_wForm.type} $${_wForm.amount.toLocaleString()}${_wForm.name ? ' — '+_wForm.name : ''}`
    window.__stm_wgo('success')
    _wOnSave?.()
  } else { toast(res.error ?? '新增失敗', 'error') }
}

window.__stm_wSelFrom = function(id, name) {
  _wForm.card = name; _wForm.account_id = id
  document.querySelectorAll('#stm-w-from-grid .stm-w-acc-btn').forEach(b =>
    b.classList.toggle('selected', b.dataset.name === name && b.dataset.id === id))
  setTimeout(() => window.__stm_wgo(5), 160)
}

window.__stm_wSelTo = async function(id, name) {
  if (id === _wForm.account_id) { toast('轉出與轉入帳戶不能相同', 'error'); return }
  _wForm.toCard = name; _wForm.toAccountId = id
  const res = await api.addTransfer({
    from_account: _wForm.card, to_account: _wForm.toCard,
    from_account_id: _wForm.account_id || undefined, to_account_id: _wForm.toAccountId || undefined,
    amount: _wForm.amount, date: _wForm.date, note: _wForm.note || null,
  })
  if (res.ok) {
    document.getElementById('stm-w-ok-detail').textContent =
      `轉帳 $${_wForm.amount.toLocaleString()} ${_wForm.card} → ${_wForm.toCard}`
    window.__stm_wgo('success')
    _wOnSave?.()
  } else { toast(res.error ?? '轉帳失敗', 'error') }
}

window.__stm_wizard_close = function() {
  document.getElementById('stm-wizard').classList.remove('open')
}

window.__stm_wizard_again = function() {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  const initDate = _wPrefillDate || today
  _wAmtExpr = ''
  _wForm = { type:'', amount:0, name:'', date:initDate, category:'', card:_wPrefillCard||'', account_id:'', note:'', toCard:'', toAccountId:'' }
  document.getElementById('stm-w-amt-num').textContent = '0'
  document.getElementById('stm-w-amt').className = 'stm-w-amt-value zero'
  document.getElementById('stm-w-amt-expr').textContent = ''
  document.getElementById('stm-w-name').value = ''
  document.getElementById('stm-w-xfr-note').value = ''
  document.getElementById('stm-w-title').textContent = '新增記錄'
  ;['stm-w-tab-e','stm-w-tab-i','stm-w-tab-t'].forEach(id => document.getElementById(id).className = 'stm-w-type-tab')
  document.getElementById('stm-w-cat-ph').style.display = 'flex'
  document.getElementById('stm-w-cat-ph').textContent = '選擇類型後顯示分類'
  document.getElementById('stm-w-cat-wrap').style.display = 'none'
  document.getElementById('stm-w-s2-next').disabled = true
  document.getElementById('stm-w-dots').innerHTML = ''
  // 暫時 display:none 讓 CSS transition 完全停用，避免殘影
  const wizard = document.getElementById('stm-wizard')
  wizard.style.display = 'none'
  void wizard.offsetHeight  // 強制 reflow，確保 display:none 生效
  Object.values(_W_SLIDES).forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    el.classList.remove('active', 'past')
  })
  document.getElementById('stm-ws1').classList.add('active')
  wizard.style.display = ''  // 還原（CSS .open 接管，transition 重新啟用但 slides 已在正確位置）
}

// ── 公開 API ─────────────────────────────────────────────
// 桌機：一頁式表單（跟編輯共用）；手機：分步驟精靈（觸控操作較快）
export async function openAddTxnModal({ prefillCard = null, prefillDate = null, onSave = null } = {}) {
  if (window.innerWidth <= 768) {
    injectWizardModal()
    await loadData()
    _wOnSave = onSave
    _wPrefillCard = prefillCard
    _wPrefillDate = prefillDate
    window.__stm_wizard_again()
    document.getElementById('stm-wizard').classList.add('open')
    return
  }
  injectModal()
  await loadData()
  _onSave = onSave
  _onDelete = null
  _editTxn = null
  _editScope = 'this'
  _openAddForm({ prefillCard, prefillDate })
}

function _openAddForm({ prefillCard = null, prefillDate = null } = {}) {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  const date = prefillDate || today

  document.getElementById('shared-edit-id').value = ''
  document.getElementById('shared-f-name').value = ''
  document.getElementById('shared-f-amount').value = ''
  document.getElementById('shared-f-date').value = date
  document.getElementById('shared-f-fee').value = ''
  document.getElementById('shared-fee-section').style.display = 'none'
  document.getElementById('shared-fee-toggle').textContent = '＋ 加入手續費'
  document.getElementById('shared-fee-total').textContent = ''
  document.getElementById('shared-delete-btn').style.display = 'none'

  window.__stm_setType('支出')

  const cardSel = document.getElementById('shared-f-card')
  cardSel.innerHTML = groupedAccountOpts(_allAccounts)
  const cardAcctId = prefillCard ? _allAccounts.find(a => a.name === prefillCard)?.id : null
  if (cardAcctId) cardSel.value = cardAcctId

  document.getElementById('shared-f-xfr-date').value = date
  document.getElementById('shared-f-xfr-amount').value = ''
  document.getElementById('shared-f-xfr-note').value = ''

  document.getElementById('shared-txn-modal').classList.add('open')
}

function _openEditForm(txn, { asTemplate = false } = {}) {
  // 從 note 反解手續費（例：「含手續費 $50」）
  const feeMatch = txn.note ? txn.note.match(/含手續費\s*\$([0-9,]+)/) : null
  const fee = feeMatch ? parseInt(feeMatch[1].replace(/,/g, '')) : 0
  const baseAmount = fee > 0 ? txn.amount - fee : txn.amount

  document.getElementById('shared-edit-id').value = asTemplate ? '' : txn.id
  document.getElementById('shared-f-name').value = txn.name ?? ''
  document.getElementById('shared-f-amount').value = baseAmount
  document.getElementById('shared-f-date').value = txn.date
  document.getElementById('shared-f-fee').value = fee || ''
  const feeSection = document.getElementById('shared-fee-section')
  feeSection.style.display = fee > 0 ? 'block' : 'none'
  document.getElementById('shared-fee-toggle').textContent = fee > 0 ? '－ 移除手續費' : '＋ 加入手續費'
  document.getElementById('shared-fee-total').textContent = ''
  window.__stm_updateTotal()
  document.getElementById('shared-delete-btn').style.display = asTemplate ? 'none' : 'block'
  if (asTemplate) {
    document.getElementById('shared-modal-title').textContent = '修改週期模板'
  }

  _currentType = txn.type || '支出'
  window.__stm_setType(txn.type || '支出')

  const cardSel = document.getElementById('shared-f-card')
  cardSel.innerHTML = groupedAccountOpts(_allAccounts)
  // 優先用 account_id 選取；舊資料沒有 account_id 時才退回用名稱找（可能因同名選錯，僅供相容）
  const cardAcctId = txn.account_id || _allAccounts.find(a => a.name === txn.card)?.id
  if (cardAcctId) {
    const opt = [...cardSel.options].find(o => o.value === cardAcctId)
    if (opt) cardSel.value = cardAcctId
  }

  const catSel = document.getElementById('shared-f-category')
  const catOpt = [...catSel.options].find(o => o.value === txn.category)
  if (catOpt) catSel.value = txn.category

  document.getElementById('shared-txn-modal').classList.add('open')
}

export async function openEditTxnModal(txn, { onSave = null, onDelete = null } = {}) {
  injectModal()
  await loadData()
  _onSave = onSave; _onDelete = onDelete ?? onSave
  _editTxn = txn
  _editScope = 'this'

  // 定期來源的交易：先跳出範圍選擇
  if (txn.recurring_id) {
    document.getElementById('shared-scope-txn-name').textContent = txn.name || txn.category || ''
    document.getElementById('shared-scope-modal').classList.add('open')
    return
  }

  _openEditForm(txn)
}

// ── 共用編輯轉帳 Modal ────────────────────────────────────
// 轉帳牽涉來源＋目標兩個帳戶、兩筆關聯記錄，不能套用一般收支的編輯表單，
// 所以另外做一個專用的（跟 transactions.js 原本的轉帳 modal 同一套欄位）
let _xfrOnSave = null

function injectTransferModal() {
  if (document.getElementById('shared-transfer-modal')) return
  const el = document.createElement('div')
  el.innerHTML = `
<div class="modal-overlay" id="shared-transfer-modal">
  <div class="modal" style="max-width:420px">
    <div class="modal-header">
      <div class="modal-title" id="shared-xfr-title">↔ 編輯轉帳</div>
      <button class="modal-close" onclick="window.__stm_xfr_close()">×</button>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">來源帳戶 *</label>
        <select id="shared-xfr-from"></select>
      </div>
      <div class="form-group">
        <label class="form-label">目標帳戶 *</label>
        <select id="shared-xfr-to"></select>
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group">
        <label class="form-label">金額 ($) *</label>
        <input type="number" id="shared-xfr-amount" placeholder="0" class="calc-input">
      </div>
      <div class="form-group">
        <label class="form-label">日期 *</label>
        <input type="date" id="shared-xfr-date">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">備註</label>
      <input type="text" id="shared-xfr-note" placeholder="選填">
    </div>
    <input type="hidden" id="shared-edit-transfer-id">
    <input type="hidden" id="shared-edit-transfer-txn-id">
    <div class="modal-footer">
      <button class="btn btn-danger" id="shared-xfr-delete-btn" style="margin-right:auto" onclick="window.__stm_xfr_delete()">刪除</button>
      <button class="btn btn-secondary" onclick="window.__stm_xfr_close()">取消</button>
      <button class="btn btn-primary" onclick="window.__stm_xfr_save()">更新轉帳</button>
    </div>
  </div>
</div>`.trim()
  document.body.appendChild(el.firstElementChild)
}

window.__stm_xfr_close = function() {
  window.__closeModalInstant('shared-transfer-modal')
}

window.__stm_xfr_save = async function() {
  const editId = document.getElementById('shared-edit-transfer-id').value
  const from_account_id = document.getElementById('shared-xfr-from').value
  const to_account_id = document.getElementById('shared-xfr-to').value
  const fromObj = _allAccounts.find(a => a.id === from_account_id)
  const toObj = _allAccounts.find(a => a.id === to_account_id)
  const amount = parseInt(document.getElementById('shared-xfr-amount').value)
  const date = document.getElementById('shared-xfr-date').value
  const note = document.getElementById('shared-xfr-note').value.trim() || null
  if (!amount || !date) { toast('請填寫金額和日期', 'error'); return }
  if (from_account_id === to_account_id) { toast('來源與目標帳戶不能相同', 'error'); return }
  const res = await api.updateTransfer(editId, {
    from_account: fromObj?.name ?? '', to_account: toObj?.name ?? '',
    from_account_id, to_account_id, amount, date, note,
  })
  if (res.ok) { window.__stm_xfr_close(); toast('轉帳記錄已更新'); _xfrOnSave?.() }
  else toast(res.error ?? '更新失敗', 'error')
}

window.__stm_xfr_delete = async function() {
  const transferTxnId = document.getElementById('shared-edit-transfer-txn-id').value
  if (!transferTxnId) return
  if (!confirm('確定要刪除這筆轉帳記錄（兩筆關聯記錄都會刪除）？')) return
  const res = await api.deleteTransaction(transferTxnId)
  if (res.ok) { window.__stm_xfr_close(); toast('轉帳已刪除'); _xfrOnSave?.() }
  else toast(res.error ?? '刪除失敗', 'error')
}

export async function openEditTransferModal(outTxn, inTxn, { onSave = null } = {}) {
  injectTransferModal()
  await loadData()
  _xfrOnSave = onSave

  const opts = groupedAccountOpts(_allAccounts)
  document.getElementById('shared-xfr-from').innerHTML = opts
  document.getElementById('shared-xfr-to').innerHTML = opts
  document.getElementById('shared-edit-transfer-id').value = outTxn.transfer_id
  document.getElementById('shared-edit-transfer-txn-id').value = outTxn.id
  // 優先用 account_id 選取；舊資料沒有 account_id 時才退回用名稱找（可能因同名選錯，僅供相容）
  document.getElementById('shared-xfr-from').value = outTxn.account_id || _allAccounts.find(a => a.name === outTxn.card)?.id || ''
  document.getElementById('shared-xfr-to').value = inTxn.account_id || _allAccounts.find(a => a.name === inTxn.card)?.id || ''
  document.getElementById('shared-xfr-amount').value = String(outTxn.amount)
  document.getElementById('shared-xfr-date').value = outTxn.date
  document.getElementById('shared-xfr-note').value = outTxn.note ?? ''

  document.getElementById('shared-transfer-modal').classList.add('open')
}
