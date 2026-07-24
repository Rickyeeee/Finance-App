;(function () {
  // 只在觸控裝置上啟用（手機 / 平板）
  const isTouch = () => ('ontouchstart' in window) || navigator.maxTouchPoints > 0

  let activeInput = null
  let expr = ''

  /* ── 計算表達式（僅允許數字與 +-×÷） ── */
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

  function hasOp(e) {
    // 是否含有運算符（跳過首字）
    return /[+\-×÷]/.test(e.slice(1))
  }

  function refreshDisplay() {
    const exprEl = document.getElementById('ck-expr')
    const resEl  = document.getElementById('ck-result')
    if (!exprEl) return
    exprEl.textContent = expr || ''
    if (hasOp(expr)) {
      const r = evalExpr(expr)
      resEl.textContent = r !== null ? '= ' + r.toLocaleString() : ''
    } else {
      resEl.textContent = ''
    }
  }

  function pushToInput(val) {
    if (!activeInput) return
    const prev = activeInput.value
    activeInput.value = val
    if (String(prev) !== String(val)) {
      activeInput.dispatchEvent(new Event('input',  { bubbles: true }))
      activeInput.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }

  function handleKey(v) {
    if (!activeInput) return

    if (v === '⌫') {
      expr = expr.slice(0, -1)

    } else if (v === 'C') {
      expr = ''

    } else if (v === '=') {
      const r = evalExpr(expr)
      if (r !== null) {
        expr = String(r)
        pushToInput(r)
      }

    } else if (v === '✓') {
      let final
      if (hasOp(expr)) {
        const r = evalExpr(expr)
        final = r !== null ? r : (parseFloat(expr) || 0)
      } else {
        final = parseFloat(expr) || 0
      }
      if (final > 0) pushToInput(final)
      closeKeyboard()
      return

    } else if (['+', '-', '×', '÷'].includes(v)) {
      if (!expr) return
      if (/[+\-×÷]$/.test(expr)) {
        expr = expr.slice(0, -1) + v      // 取代末尾運算符
      } else {
        const r = evalExpr(expr)
        expr = (r !== null ? String(r) : expr) + v
      }

    } else if (v === '.') {
      const parts = expr.split(/[+\-×÷]/)
      if (!parts[parts.length - 1].includes('.')) expr += '.'

    } else if (v === '00') {
      if (expr && !/[+\-×÷]$/.test(expr)) expr += '00'

    } else {
      // 數字
      expr += v
    }

    refreshDisplay()

    // 只有單純數字時即時同步到 input
    if (!hasOp(expr) && expr && !expr.endsWith('.')) {
      const n = parseFloat(expr)
      if (!isNaN(n)) pushToInput(n)
    }
  }

  /* ── 開 / 關鍵盤 ── */
  function openKeyboard(inp) {
    if (activeInput === inp) return
    if (activeInput) closeKeyboard()
    activeInput = inp
    const cur = parseFloat(inp.value)
    expr = (cur > 0) ? String(cur) : ''
    refreshDisplay()
    inp.classList.add('ck-focused')
    const wrap = document.getElementById('ck-wrap')
    wrap.classList.add('ck-open')
    setTimeout(() => inp.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200)
  }

  function closeKeyboard() {
    const wrap = document.getElementById('ck-wrap')
    if (wrap) wrap.classList.remove('ck-open')
    if (activeInput) activeInput.classList.remove('ck-focused')
    activeInput = null
    expr = ''
  }

  /* ── 建立鍵盤 DOM ── */
  function buildKeyboard() {
    const style = document.createElement('style')
    style.textContent = `
#ck-wrap{
  position:fixed;bottom:0;left:0;right:0;z-index:9999;
  background:#1c2128;border-top:1px solid #373e47;
  transform:translateY(100%);transition:transform .28s cubic-bezier(.4,0,.2,1);
  padding-bottom:max(8px,env(safe-area-inset-bottom));
  -webkit-user-select:none;user-select:none;
}
#ck-wrap.ck-open{transform:translateY(0);}
#ck-display{
  display:flex;align-items:baseline;gap:10px;
  padding:10px 18px 6px;min-height:42px;
}
#ck-expr{font-size:22px;font-weight:400;color:#e6edf3;flex:1;word-break:break-all;}
#ck-result{font-size:13px;color:#58a6ff;flex-shrink:0;}
.ck-rows{display:flex;flex-direction:column;gap:5px;padding:0 10px 6px;}
.ck-row{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;}
.ck-btn{
  border:none;border-radius:10px;font-size:22px;cursor:pointer;
  height:56px;display:flex;align-items:center;justify-content:center;
  -webkit-tap-highlight-color:transparent;transition:opacity .08s;
  font-family:-apple-system,BlinkMacSystemFont,sans-serif;
}
.ck-btn:active{opacity:.55;}
.ck-num{background:#2d333b;color:#e6edf3;}
.ck-op {background:#373e47;color:#cdd9e5;font-size:20px;}
.ck-del{background:#373e47;color:#8b949e;font-size:18px;}
.ck-clr{background:#373e47;color:#f85149;font-size:16px;font-weight:600;}
.ck-eq {background:#373e47;color:#cdd9e5;font-size:18px;}
.ck-ok {background:#2ea043;color:#fff;font-size:20px;}
input.ck-focused{outline:2px solid var(--accent,#58a6ff)!important;outline-offset:1px;}
`
    document.head.appendChild(style)

    const wrap = document.createElement('div')
    wrap.id = 'ck-wrap'
    wrap.innerHTML = `
<div id="ck-display"><span id="ck-expr"></span><span id="ck-result"></span></div>
<div class="ck-rows">
  <div class="ck-row">
    <button class="ck-btn ck-op"  data-v="÷">÷</button>
    <button class="ck-btn ck-op"  data-v="×">×</button>
    <button class="ck-btn ck-op"  data-v="-">−</button>
    <button class="ck-btn ck-op"  data-v="+">+</button>
  </div>
  <div class="ck-row">
    <button class="ck-btn ck-num" data-v="7">7</button>
    <button class="ck-btn ck-num" data-v="8">8</button>
    <button class="ck-btn ck-num" data-v="9">9</button>
    <button class="ck-btn ck-del" data-v="⌫">⌫</button>
  </div>
  <div class="ck-row">
    <button class="ck-btn ck-num" data-v="4">4</button>
    <button class="ck-btn ck-num" data-v="5">5</button>
    <button class="ck-btn ck-num" data-v="6">6</button>
    <button class="ck-btn ck-clr" data-v="C">C</button>
  </div>
  <div class="ck-row">
    <button class="ck-btn ck-num" data-v="1">1</button>
    <button class="ck-btn ck-num" data-v="2">2</button>
    <button class="ck-btn ck-num" data-v="3">3</button>
    <button class="ck-btn ck-eq"  data-v="=">=</button>
  </div>
  <div class="ck-row">
    <button class="ck-btn ck-num" data-v=".">.</button>
    <button class="ck-btn ck-num" data-v="0">0</button>
    <button class="ck-btn ck-num" data-v="00">00</button>
    <button class="ck-btn ck-ok"  data-v="✓">✓</button>
  </div>
</div>`

    // 觸碰鍵盤時不觸發 blur
    wrap.addEventListener('touchstart', e => { e.stopPropagation() }, { passive: true })
    wrap.addEventListener('touchend', e => {
      e.preventDefault()
      const btn = e.target.closest('[data-v]')
      if (btn) handleKey(btn.dataset.v)
    })
    // 桌機滑鼠支援
    wrap.addEventListener('mousedown', e => e.preventDefault())
    wrap.addEventListener('click', e => {
      const btn = e.target.closest('[data-v]')
      if (btn) handleKey(btn.dataset.v)
    })
    document.body.appendChild(wrap)
  }

  /* ── 綁定 input ── */
  function setupInput(inp) {
    if (inp._ckBound) return
    inp._ckBound = true
    inp.setAttribute('inputmode', 'none')
    inp.setAttribute('autocomplete', 'off')

    // 手機：只有「真正點擊」（沒有明顯位移）才開計算鍵盤，讓滑動/捲動手勢可以正常穿透——
    // 跟名稱等一般文字欄位靠瀏覽器原生 focus 判斷的觸發邏輯一致，不會一碰到就跳出編輯
    let tsx = 0, tsy = 0, tsMoved = false
    inp.addEventListener('touchstart', e => {
      const t = e.touches[0]
      tsx = t.clientX; tsy = t.clientY; tsMoved = false
    }, { passive: true })
    inp.addEventListener('touchmove', e => {
      const t = e.touches[0]
      if (Math.abs(t.clientX - tsx) > 8 || Math.abs(t.clientY - tsy) > 8) tsMoved = true
    }, { passive: true })
    inp.addEventListener('touchend', e => {
      if (tsMoved) return
      e.preventDefault() // 阻止原生鍵盤彈出，改顯示自訂計算鍵盤
      openKeyboard(inp)
    }, { passive: false })

    // 桌機 focus（不影響原生鍵盤，直接顯示計算鍵盤）
    inp.addEventListener('focus', () => openKeyboard(inp))
  }

  /* ── 初始化 ── */
  function init() {
    if (!isTouch()) return   // 桌機略過

    buildKeyboard()

    // 點擊鍵盤外 → 關閉
    document.addEventListener('touchstart', e => {
      const wrap = document.getElementById('ck-wrap')
      if (!wrap?.classList.contains('ck-open')) return
      if (!e.target.closest('#ck-wrap') && !e.target.closest('.calc-input')) {
        closeKeyboard()
      }
    }, { passive: true })

    const scan = () => document.querySelectorAll('input.calc-input').forEach(setupInput)
    scan()
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
