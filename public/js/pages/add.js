import { api, catIcon, swr } from '/js/api.js'

// 快速新增流程（原本獨立的 add.html，現在整合成 SPA 的一頁）
// router 每次進入頁面時呼叫 show()

export default async function show({ signal }) {

let cats = [], incomeCats = [], accs = []
let form = { type: '', amount: 0, name: '', date: '', category: '', card: '', account_id: '', note: '', toCard: '', toAccountId: '' }
let amtExpr = ''

function esc(s) { return String(s).replace(/'/g, "\\'") }
function resolveIcon(c) { return c.icon || catIcon(c.name) }

const urlDate = new URLSearchParams(location.search).get('date')
const todayTW = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
const defaultDate = urlDate || todayTW
form.date = defaultDate
document.getElementById('add-inp-date').value = defaultDate

function applyCats(list) {
  cats = list.filter(c => c.type === '支出')
  incomeCats = list.filter(c => c.type === '收入')
}
function applyAccs(list) {
  accs = list
  renderAccs()
  renderXfrAccs()
}

async function loadData() {
  const cachedCats = swr.get('categories')
  const cachedAccts = swr.get('accounts')
  if (cachedCats) applyCats(cachedCats)
  if (cachedAccts) applyAccs(cachedAccts)

  const [cr, ar] = await Promise.all([api.getCategories(), api.getAssets()])
  if (cr.ok) { swr.set('categories', cr.data); applyCats(cr.data) }
  if (ar.ok) { swr.set('accounts', ar.data.accounts ?? []); applyAccs(ar.data.accounts ?? []) }
}

// ── Dots ──
function renderDots(n) {
  const el = document.getElementById('add-dots')
  const total = form.type === '轉帳' ? 5 : 4
  if (n === 1) { el.innerHTML = ''; return }
  let h = ''
  for (let i = 2; i <= total; i++) {
    h += `<div class="dot ${i < n ? 'done' : i === n ? 'active' : ''}"></div>`
  }
  el.innerHTML = h
}

// ── Slide ──
const slideIds = { 1: 'add-s1', 2: 'add-s2', 3: 'add-s3', 4: 'add-s4', 5: 'add-s5', success: 'add-s-success' }

window.addGoTo = function(n) {
  if (n === 3) {
    const isXfr = form.type === '轉帳'
    document.getElementById('add-s3-normal').style.display = isXfr ? 'none' : 'flex'
    document.getElementById('add-s3-xfr').style.display    = isXfr ? 'flex' : 'none'
    if (!isXfr) document.getElementById('add-inp-date').value = form.date
    else        document.getElementById('add-xfr-date').value = form.date
  }
  if (n === 4) {
    const isXfr = form.type === '轉帳'
    if (!isXfr) {
      form.name = document.getElementById('add-inp-name').value.trim()
      form.date = document.getElementById('add-inp-date').value || defaultDate
      renderSummary()
    } else {
      form.note = document.getElementById('add-xfr-note').value.trim()
      form.date = document.getElementById('add-xfr-date').value || defaultDate
    }
    document.getElementById('add-s4-acc').style.display  = isXfr ? 'none' : 'flex'
    document.getElementById('add-s4-from').style.display = isXfr ? 'flex' : 'none'
  }
  if (n === 5 && form.type === '轉帳') {
    document.getElementById('add-to-grid').innerHTML = groupedAccBtns(
      accs.filter(a => a.name !== form.card), 'addSelectTo'
    )
    document.getElementById('add-xfr-from-label').textContent = `從 ${form.card} 轉出`
  }

  Object.entries(slideIds).forEach(([k, id]) => {
    const el = document.getElementById(id)
    const ki = parseInt(k)
    el.classList.remove('active', 'past')
    if (!isNaN(ki)) {
      if (ki < n) el.classList.add('past')
      else if (ki === n) el.classList.add('active')
    }
  })
  if (n === 'success') document.getElementById('add-s-success').classList.add('active')
  if (typeof n === 'number') renderDots(n)
  if (n === 3 && form.type !== '轉帳') setTimeout(() => document.getElementById('add-inp-name').focus(), 350)
}

// ── Type select ──
window.addSelectType = function(type) {
  form.type = type
  document.getElementById('add-tab-expense').className  = 'type-tab' + (type === '支出' ? ' active-expense'  : '')
  document.getElementById('add-tab-income').className   = 'type-tab' + (type === '收入' ? ' active-income'   : '')
  document.getElementById('add-tab-transfer').className = 'type-tab' + (type === '轉帳' ? ' active-transfer' : '')
  document.getElementById('add-topbar-title').textContent = '新增' + type

  if (type === '轉帳') {
    document.getElementById('add-cat-placeholder').style.display = 'flex'
    document.getElementById('add-cat-placeholder').textContent = '轉帳無需選擇分類'
    document.getElementById('add-cat-grid-wrap').style.display = 'none'
    document.getElementById('add-btn-s2-next').disabled = false
  } else {
    const list = type === '支出' ? cats : incomeCats
    document.getElementById('add-cat-placeholder').style.display = 'none'
    document.getElementById('add-cat-grid-wrap').style.display = 'flex'
    document.getElementById('add-cat-grid-wrap').style.flexDirection = 'column'
    form.category = ''
    document.getElementById('add-btn-s2-next').disabled = true
    const grid = document.getElementById('add-cat-grid')
    if (!list.length) {
      grid.innerHTML = '<div style="color:var(--text-muted);font-size:14px;padding:20px 0;grid-column:span 2">尚無分類</div>'
    } else {
      grid.innerHTML = list.map(c => {
        const icon = resolveIcon(c)
        return `<button class="choose-btn" data-name="${esc(c.name)}" onclick="addSelectCat('${esc(c.name)}')" style="text-align:left;display:flex;align-items:center;gap:8px"><span style="font-size:20px;flex-shrink:0">${icon}</span><span>${c.name}</span></button>`
      }).join('')
    }
  }
}

window.addSelectCat = function(cat) {
  form.category = cat
  document.querySelectorAll('#add-cat-grid .choose-btn').forEach(b =>
    b.classList.toggle('selected', b.dataset.name === cat))
  document.getElementById('add-btn-s2-next').disabled = false
  document.getElementById('add-inp-date').value = form.date
  setTimeout(() => window.addGoTo(3), 160)
}

// ── Calculator ──
function hasOp(e) { return /[+\-×÷]/.test(e.slice(1)) }
function evalExpr(e) {
  if (!e || !e.trim()) return null
  const safe = e.replace(/×/g, '*').replace(/÷/g, '/')
  if (!/^[\d+\-*/.()\s]+$/.test(safe)) return null
  try {
    const r = Function('"use strict"; return (' + safe + ')')()
    if (!isFinite(r) || isNaN(r)) return null
    return Math.round(r * 100) / 100
  } catch { return null }
}

function refreshAmt() {
  const num = hasOp(amtExpr) ? (evalExpr(amtExpr) ?? 0) : (parseFloat(amtExpr) || 0)
  document.getElementById('add-amt-text').textContent = num ? num.toLocaleString() : '0'
  document.getElementById('add-amt-display').className = 'amount-value' + (num ? '' : ' zero')
  if (hasOp(amtExpr)) {
    const r = evalExpr(amtExpr)
    document.getElementById('add-amt-expr').textContent = amtExpr + (r !== null ? ' = ' + r.toLocaleString() : '')
  } else {
    document.getElementById('add-amt-expr').textContent = ''
  }
  form.amount = num
}

window.addCk = function(v) {
  if (v === '⌫') { amtExpr = amtExpr.slice(0, -1) }
  else if (v === 'C') { amtExpr = '' }
  else if (v === '=') { const r = evalExpr(amtExpr); if (r !== null) amtExpr = String(r) }
  else if (v === '✓') {
    if (hasOp(amtExpr)) { const r = evalExpr(amtExpr); if (r !== null) { amtExpr = String(r); refreshAmt() } }
    if (form.amount > 0) window.addGoTo(2)
    return
  } else if (['+', '-', '×', '÷'].includes(v)) {
    if (!amtExpr) return
    if (/[+\-×÷]$/.test(amtExpr)) amtExpr = amtExpr.slice(0, -1) + v
    else { const r = evalExpr(amtExpr); amtExpr = (r !== null ? String(r) : amtExpr) + v }
  } else if (v === '.') {
    const parts = amtExpr.split(/[+\-×÷]/)
    if (!parts[parts.length - 1].includes('.')) amtExpr += '.'
  } else if (v === '00') {
    if (amtExpr && !/[+\-×÷]$/.test(amtExpr)) amtExpr += '00'
  } else { amtExpr += v }
  refreshAmt()
}

// ── Summary ──
function renderSummary() {
  document.getElementById('add-summary-preview').innerHTML = `
    <div class="summary-row"><span class="key">類型</span><span class="val">${form.type}</span></div>
    <div class="summary-row"><span class="key">日期</span><span class="val">${form.date}</span></div>
    <div class="summary-row"><span class="key">分類</span><span class="val">${form.category}</span></div>
    <div class="summary-row"><span class="key">金額</span><span class="val">$${form.amount.toLocaleString()}</span></div>
    ${form.name ? `<div class="summary-row"><span class="key">名稱</span><span class="val">${form.name}</span></div>` : ''}
  `
}

// ── Accounts ──
const TYPE_LABEL = { '銀行': '銀行', '銀行存款': '銀行', '信用卡': '信用卡', '現金': '現金', '證券戶': '證券戶', '投資帳戶': '證券戶' }

function groupedAccBtns(list, onclickFn) {
  if (!list.length) return '<div style="color:var(--text-muted);font-size:14px;padding:20px 0;grid-column:span 2">尚無帳戶資料</div>'
  const groups = {}
  for (const a of list) {
    const label = TYPE_LABEL[a.type] ?? a.type ?? '其他'
    ;(groups[label] = groups[label] ?? []).push(a)
  }
  const order = ['銀行', '信用卡', '現金', '證券戶']
  const orderedKeys = [...order.filter(k => groups[k]), ...Object.keys(groups).filter(k => !order.includes(k))]
  let html = ''
  for (const label of orderedKeys) {
    html += `<div style="grid-column:span 2;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;padding:10px 0 4px">${label}</div>`
    html += groups[label].map(a =>
      `<button class="choose-btn" data-id="${esc(a.id ?? '')}" data-name="${esc(a.name)}" onclick="${onclickFn}('${esc(a.id ?? '')}','${esc(a.name)}')">${a.name}</button>`
    ).join('')
  }
  return html
}

function renderAccs() {
  document.getElementById('add-acc-grid').innerHTML = groupedAccBtns(accs, 'addSelectAcc')
}

window.addSelectAcc = async function(id, name) {
  form.card = name
  form.account_id = id
  document.querySelectorAll('#add-acc-grid .choose-btn').forEach(b => b.classList.toggle('selected', b.dataset.name === name && b.dataset.id === id))
  await submitNormal()
}

function renderXfrAccs() {
  document.getElementById('add-from-grid').innerHTML = groupedAccBtns(accs, 'addSelectFrom')
  document.getElementById('add-to-grid').innerHTML   = groupedAccBtns(accs, 'addSelectTo')
}

window.addSelectFrom = function(id, name) {
  form.card = name
  form.account_id = id
  document.querySelectorAll('#add-from-grid .choose-btn').forEach(b => b.classList.toggle('selected', b.dataset.name === name && b.dataset.id === id))
  setTimeout(() => window.addGoTo(5), 160)
}

window.addSelectTo = async function(id, name) {
  if (name === form.card) { alert('轉出與轉入帳戶不能相同'); return }
  form.toCard = name
  form.toAccountId = id
  document.querySelectorAll('#add-to-grid .choose-btn').forEach(b => b.classList.toggle('selected', b.dataset.name === name && b.dataset.id === id))
  await submitTransfer()
}

// ── Submit ──
async function submitNormal() {
  try {
    const res = await api.addTransaction({
      name: form.name, amount: form.amount, date: form.date,
      category: form.category, card: form.card, account_id: form.account_id || undefined,
      type: form.type, status: '待確認', source: '手動輸入',
    })
    if (res.ok) {
      document.getElementById('add-success-detail').textContent =
        `${form.type} $${form.amount.toLocaleString()}${form.name ? ' — ' + form.name : ''}`
      window.addGoTo('success')
      swr.delete('txns-' + form.date.slice(0, 7))
    } else { alert('新增失敗：' + (res.error ?? '未知錯誤')) }
  } catch { alert('網路錯誤，請重試') }
}

async function submitTransfer() {
  try {
    const res = await api.addTransfer({
      from_account: form.card, to_account: form.toCard,
      from_account_id: form.account_id, to_account_id: form.toAccountId,
      amount: form.amount, date: form.date, note: form.note || null,
    })
    if (res.ok) {
      document.getElementById('add-success-detail').textContent =
        `轉帳 $${form.amount.toLocaleString()} ${form.card} → ${form.toCard}`
      window.addGoTo('success')
      swr.delete('txns-' + form.date.slice(0, 7))
    } else { alert('新增失敗：' + (res.error ?? '未知錯誤')) }
  } catch { alert('網路錯誤，請重試') }
}

// ── Reset ──
window.addReset = function() {
  const newTW = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  form = { type: '', amount: 0, name: '', date: newTW, category: '', card: '', account_id: '', note: '', toCard: '', toAccountId: '' }
  amtExpr = ''
  document.getElementById('add-amt-text').textContent = '0'
  document.getElementById('add-amt-display').className = 'amount-value zero'
  document.getElementById('add-amt-expr').textContent = ''
  document.getElementById('add-inp-name').value = ''
  document.getElementById('add-inp-date').value = newTW
  document.getElementById('add-xfr-note').value = ''
  document.getElementById('add-topbar-title').textContent = '新增記錄'
  document.querySelectorAll('#add-wrap .choose-btn').forEach(b => b.classList.remove('selected'))
  document.getElementById('add-tab-expense').className = 'type-tab'
  document.getElementById('add-tab-income').className  = 'type-tab'
  document.getElementById('add-tab-transfer').className= 'type-tab'
  document.getElementById('add-cat-placeholder').style.display = 'flex'
  document.getElementById('add-cat-placeholder').textContent = '選擇類型後顯示分類'
  document.getElementById('add-cat-grid-wrap').style.display = 'none'
  document.getElementById('add-btn-s2-next').disabled = true
  window.addGoTo(1)
}

renderDots(1)
await loadData()

}
