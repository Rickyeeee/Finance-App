// ── SPA Router ──
// 五個頁面共用同一個 index.html：<template> 置換 + history API
// 每頁的邏輯在 /js/pages/<key>.js，進入頁面時呼叫該模組的 show({ signal })
// signal 供頁面掛 window/document 層級監聽用，離開頁面時自動 abort 解除
import { initAppName, toast, openUpdateModal, hideSplash } from '/js/api.js'

const PAGE_BY_PATH = {
  '/': 'overview',
  '/index.html': 'overview',
  '/transactions.html': 'transactions',
  '/reconcile.html': 'reconcile',
  '/investments.html': 'investments',
  '/report.html': 'report',
  '/add': 'add',
  '/add.html': 'add', // 相容舊的「新增記錄」主畫面捷徑
}
const PATH_BY_PAGE = {
  overview: '/',
  transactions: '/transactions.html',
  reconcile: '/reconcile.html',
  investments: '/investments.html',
  report: '/report.html',
  add: '/add',
}

const root = document.getElementById('page-root')
let currentPage = null
let ac = null
let navSeq = 0

// 關掉瀏覽器自己的捲動還原，避免跟切頁時的 scrollTo(0,0) 互搶、導致沒回到最上面
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

async function show(page, { push = true, search = '' } = {}) {
  if (!PATH_BY_PAGE[page]) page = 'overview'
  if (page === currentPage) return
  const seq = ++navSeq
  if (push) history.pushState({ page }, '', PATH_BY_PAGE[page] + search)
  currentPage = page

  ac?.abort()
  ac = new AbortController()

  // 關掉上一頁可能還留著沒關的浮動視窗（例如切頁時沒有正常觸發 close），
  // 不然視窗會殘留在新頁面上面造成殘影，而且它鎖住的捲動狀態也會一直卡住
  document.querySelectorAll('.modal-overlay.open, #rec-modal.open, #acct-view-modal.open, #stm-wizard.open').forEach(m => m.classList.remove('open'))
  window.__resetScrollLock?.()

  const tpl = document.getElementById('tpl-' + page)
  root.replaceChildren(tpl.content.cloneNode(true))
  window.scrollTo(0, 0)

  const pageTitle = tpl.dataset.title
  const appName = document.title.split(' — ')[1]
  document.title = appName ? `${pageTitle} — ${appName}` : pageTitle
  document.querySelectorAll('[data-page]').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page))

  try {
    const mod = await import('/js/pages/' + page + '.js')
    if (seq !== navSeq) return // 使用者已切到別頁
    await mod.default({ signal: ac.signal })
  } catch (e) {
    if (seq === navSeq) {
      console.error(e)
      toast('頁面載入失敗', 'error')
    }
  }
  // 保底關閉開機畫面：只有 overview.js 會主動關閉 splash，若從其他頁面（如 /add）直接
  // 進站、或頁面模組出錯，splash 會卡住不消失——這裡設一個寬限時間強制關掉，
  // 但不要太快，避免搶在 overview 自己「等資料回來再關」的體驗前面觸發
  if (seq === navSeq) setTimeout(() => { if (seq === navSeq) hideSplash() }, 1500)
}

// 導覽連結攔截（sidebar + bottom-nav）
document.addEventListener('click', e => {
  const a = e.target.closest('a')
  if (!a) return
  if (a.classList.contains('add-center')) {
    // 「+」：在消費記錄頁 → 快速新增（帶當前選取日期）；其他頁 → 切到消費記錄
    e.preventDefault()
    if (currentPage === 'transactions') {
      show('add', { search: window.__getAddSearch ? window.__getAddSearch() : '' })
    } else {
      show('transactions')
    }
    return
  }
  if (a.dataset.page) {
    e.preventDefault()
    show(a.dataset.page)
  }
})

window.addEventListener('popstate', () => {
  show(PAGE_BY_PATH[location.pathname] ?? 'overview', { push: false })
})

// 設定/更新 modal（sidebar 按鈕用）
window.__openSettings = openUpdateModal

initAppName()
history.replaceState({ page: PAGE_BY_PATH[location.pathname] ?? 'overview' }, '', location.pathname + location.search)
show(PAGE_BY_PATH[location.pathname] ?? 'overview', { push: false }).then(() => {
  // 首頁載完後，背景把其他頁的模組與資料全部預載進快取 → 切頁零等待
  const idle = 'requestIdleCallback' in window ? f => requestIdleCallback(f, { timeout: 3000 }) : f => setTimeout(f, 1000)
  idle(() => {
    for (const p of Object.keys(PATH_BY_PAGE)) {
      if (p === currentPage) continue // 目前頁面已載入自己的資料
      import('/js/pages/' + p + '.js').then(m => m.prefetch?.()).catch(() => {})
    }
  })
})
