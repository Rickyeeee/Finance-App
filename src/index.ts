import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings } from './types'
import transactionsRoute from './routes/transactions'
import installerRoute from './routes/installer'
import investmentsRoute from './routes/investments'
import summaryRoute from './routes/summary'
import reconcileRoute from './routes/reconcile'
import assetsRoute from './routes/assets'
import categoriesRoute from './routes/categories'
import recurringRoute from './routes/recurring'
import authRoute from './routes/auth'
import { getAssets, getCategories, processRecurring, createTransfer, getInvestments, getMonthlySummary, recordAssetSnapshot } from './db/queries'
import { generateShortcut } from './shortcut-generator'

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// 公開端點：不需要驗證
app.get('/api/app-config', async (c) => {
  try {
    const row = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('app_name').first<{ value: string }>()
    const app_name = row?.value || c.env.APP_NAME || '我的財務'
    return c.json({ app_name })
  } catch {
    return c.json({ app_name: c.env.APP_NAME || '我的財務' })
  }
})

// add 頁專用 manifest（獨立的主畫面圖示身分：不同名稱、不同 icon、不同 start_url）。
// 現在 /add 已經是主 SPA 裡的一頁，實際切換到其他頁面時是純前端路由、不會有真正的換頁，
// 所以這裡放心讓它跟主 App 的身分不同也不會再卡住。
app.get('/add-manifest.json', async (c) => {
  return c.json({
    name: '新增記錄',
    short_name: '新增',
    description: '快速新增記錄',
    // 帶 ?r= 版本標記：iOS 主畫面圖示的快取常常不會出現在「設定 > Safari > 網站資料」裡，
    // 使用者刪不掉、清不掉，只能靠換一個沒被快取過的 start_url 逼 iOS 建立全新的獨立圖示身分
    start_url: '/add?r=2',
    scope: '/',
    display: 'standalone',
    background_color: '#0d1117',
    theme_color: '#0d1117',
    orientation: 'portrait-primary',
    icons: [{ src: '/icons/add-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
  }, 200, { 'Content-Type': 'application/manifest+json' })
})

// 動態 manifest.json（從 DB 讀 app_name）
app.get('/manifest.json', async (c) => {
  let appName = c.env.APP_NAME || '我的財務'
  try {
    const row = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('app_name').first<{ value: string }>()
    if (row?.value) appName = row.value
  } catch {}
  return c.json({
    name: appName,
    short_name: appName,
    description: '個人財務管理系統',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0d1117',
    theme_color: '#161b22',
    orientation: 'portrait-primary',
    icons: [{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
  }, 200, { 'Content-Type': 'application/manifest+json' })
})

// 登入端點不需要驗證
app.route('/api/auth', authRoute)

// 所有其他 /api/* 路由都需要 Bearer token
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()
  // cron 有自己的 CRON_SECRET 驗證
  if (c.req.path === '/api/cron/run') return next()

  if (c.req.path.startsWith('/api/installer')) return next()
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token || token !== c.env.AUTH_TOKEN) {
    return c.json({ ok: false, error: '未授權' }, 401)
  }
  return next()
})

// 更新 app 名稱（需驗證）
app.patch('/api/app-config', async (c) => {
  const body = await c.req.json<{ app_name: string }>()
  const name = (body.app_name ?? '').trim()
  if (!name) return c.json({ ok: false, error: '名稱不能為空' }, 400)
  await c.env.DB.prepare(
    'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
  ).bind('app_name', name).run()
  return c.json({ ok: true, app_name: name })
})

// 安裝程式（不需要驗證，自帶 Cloudflare API token）
app.route('/api/installer', installerRoute)

// iOS 捷徑動態生成（token 嵌入）— 不需要驗證，token 來自 query param
app.get('/api/shortcut/download', async (c) => {
  const token = c.req.query('t')
  if (!token) return c.json({ ok: false, error: 'missing token' }, 400)
  try {
    const buf = generateShortcut(token)
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.apple.shortcut',
        'Content-Disposition': 'attachment; filename=jizhang.shortcut'
      }
    })
  } catch (e: any) {
    return c.json({ ok: false, error: String(e?.message ?? e) }, 500)
  }
})

app.route('/api/transactions', transactionsRoute)
app.route('/api/investments', investmentsRoute)
app.route('/api/summary', summaryRoute)
app.route('/api/reconcile', reconcileRoute)
app.route('/api/assets', assetsRoute)
app.route('/api/categories', categoriesRoute)
app.route('/api/recurring', recurringRoute)

// 捷徑專用：回傳簡單字串陣列，方便 iOS Shortcuts 解析
app.get('/api/shortcut/data', async (c) => {
  const [cats, assets] = await Promise.all([getCategories(c.env.DB), getAssets(c.env.DB)])
  const expCats = cats.filter(ct => ct.type !== '收入')
  const incCats = cats.filter(ct => ct.type === '收入')
  return c.json({
    expense_categories: expCats.map(ct => ct.name),
    income_categories:  incCats.map(ct => ct.name),
    accounts: assets.filter(a => a.type !== '投資帳戶').map(a => a.name),
    expense_category_objects: expCats.map(ct => ({ name: ct.name, icon: ct.icon ?? null })),
    income_category_objects:  incCats.map(ct => ({ name: ct.name, icon: ct.icon ?? null })),
    account_objects: assets.filter(a => a.type !== '投資帳戶').map(a => ({ id: a.id, name: a.name, type: a.type })),
  })
})

// Cron 端點：保護用（手動補跑快照/定期交易的備援入口，
// cron trigger 若曾失敗，可用這個端點手動補一次）
app.post('/api/cron/run', async (c) => {
  const secret = c.req.header('x-cron-secret')
  if (secret !== c.env.CRON_SECRET) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }
  return runDayStart(c.env)
    .then(result => c.json({ ok: true, ...result }))
    .catch(e => c.json({ ok: false, error: String(e) }, 500))
})

// SPA：舊的頁面路徑一律回傳 index.html（前端 router 依 pathname 顯示對應頁面）
// /add、/add.html 現在也是同一個 SPA 裡的一頁（不再是獨立檔案），
// 這樣從 add 頁切到消費記錄等頁面時是純前端路由切換，不會有真正的瀏覽器換頁——
// 這是修掉 iOS 主畫面 App 之間切換會卡住的根本方法。
const SPA_PATHS = new Set(['/transactions.html', '/reconcile.html', '/investments.html', '/report.html', '/add', '/add.html'])

// /add、/add.html 專屬的主畫面圖示身分（manifest、標題、icon 都不同），
// 只影響「加入主畫面」當下抓到的識別資訊，不影響實際頁面內容或後續的 SPA 內部導覽
const ADD_PATHS = new Set(['/add', '/add.html'])

// 靜態檔案 fallback（讓 ASSETS binding 處理所有未匹配的路由）
app.all('*', async (c) => {
  const path = new URL(c.req.url).pathname
  let assetReq = c.req.raw
  if (c.req.method === 'GET' && SPA_PATHS.has(path)) {
    // 用 '/' 而非 '/index.html'：assets 會把 /index.html 307 轉址回 /，反而丟失原路徑
    const u = new URL(c.req.url)
    u.pathname = '/'
    assetReq = new Request(u.toString(), c.req.raw)
  }
  const res = await (c.env.ASSETS as Fetcher).fetch(assetReq)
  const ct = res.headers.get('content-type') ?? ''
  // sw.js / js/ / css/ 的 no-store 快取規則在 public/_headers 設定——
  // 這些路徑對應真實存在的靜態檔案，Cloudflare 會直接由 Assets 層回應，
  // 不會進到這支 Worker，在這裡設 header 不會有效果
  if (ct.includes('text/html')) {
    let body = await res.text()
    if (ADD_PATHS.has(path)) {
      body = body
        .replace('<link rel="manifest" href="/manifest.json">', '<link rel="manifest" href="/add-manifest.json">')
        .replace(/<meta name="apple-mobile-web-app-title" content="[^"]*">/, '<meta name="apple-mobile-web-app-title" content="新增記錄">')
        .replace(/<link rel="apple-touch-icon" href="[^"]*">/, '<link rel="apple-touch-icon" href="/icons/add-icon.svg">')
        .replace(/<meta name="theme-color" content="[^"]*">/, '<meta name="theme-color" content="#0d1117">')
    }
    const newRes = new Response(body, res)
    newRes.headers.set('Content-Type', 'text/html;charset=UTF-8')
    newRes.headers.set('Cache-Control', 'no-cache')
    return newRes
  }
  return res
})

// Cloudflare Scheduled Worker（每天 22:00 台北時間 = UTC 14:00）
export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    // 沒有 .catch() 的話這裡拋錯只會變成無聲的 unhandled rejection，
    // Cloudflare log 裡完全找不到線索——曾經因此漏了 5 天的資產快照都不知道原因
    ctx.waitUntil(runDayStart(env).catch(e => console.error('[cron] runDayStart 失敗：', e)))
  },
}

// 每天 00:00 台北時間：記錄昨日快照 + 生成今日定期交易 + 自動扣繳
async function runDayStart(env: Bindings) {
  const { DB } = env
  const taipeiNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const todayStr = fmt(taipeiNow)
  const yesterday = new Date(taipeiNow)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = fmt(yesterday)

  // 記錄昨日資產快照——這步最重要也最沒辦法事後補救（快照記的是當下市值，
  // 過了那天就永遠拿不回來），獨立包一層 try/catch，不讓後面步驟的錯誤連累到它，
  // 也不讓它自己的錯誤被吞掉沒有記錄
  let totalCash = 0, totalInvestmentsValue = 0
  try {
    const [allAssetsSnap, allInvestmentsSnap] = await Promise.all([
      getAssets(DB),
      getInvestments(DB),
    ])
    const monthKey = yesterdayStr.slice(0, 7)
    const { total: monthlyExpense } = await getMonthlySummary(DB, monthKey)
    totalCash = allAssetsSnap
      .filter(a => a.type === '銀行' || a.type === '現金' || a.type === '銀行存款')
      .reduce((s, a) => s + a.balance, 0)
    totalInvestmentsValue = allInvestmentsSnap.reduce((s, i) => s + i.market_value, 0)
    await recordAssetSnapshot(DB, {
      snapshot_date: yesterdayStr,
      total_assets: totalCash + totalInvestmentsValue,
      total_investments: totalInvestmentsValue,
      total_cash: totalCash,
      monthly_expense: monthlyExpense,
    })
  } catch (e) {
    console.error('[cron] 資產快照記錄失敗，' + yesterdayStr + ' 這天將永久缺資料：', e)
  }

  // 生成今日定期交易
  const recurringCount = await processRecurring(DB)

  // 自動扣繳
  const todayDay = taipeiNow.getDate()
  const allAssets = await getAssets(DB)
  for (const cc of allAssets) {
    if (cc.type !== '信用卡' || cc.payment_method !== 'auto' || !cc.payment_account || cc.billing_day !== todayDay) continue
    const y = taipeiNow.getFullYear(), m = taipeiNow.getMonth() + 1
    const monthStr = `${y}-${String(m).padStart(2,'0')}`
    const periodStart = fmt(new Date(y, m - 2, cc.billing_day + 1))
    const { results: ccTxns } = await DB.prepare(
      `SELECT * FROM transactions WHERE date >= ? AND date <= ? AND card = ? AND type != '收入' AND transfer_id IS NULL LIMIT 1000`
    ).bind(periodStart, todayStr, cc.name).all<any>()
    const billAmount = ccTxns.reduce((s: number, t: any) => s + t.amount, 0)
    if (billAmount > 0) {
      await createTransfer(DB, {
        from_account: cc.payment_account, from_account_id: cc.payment_account_id,
        to_account: cc.name, to_account_id: cc.id,
        amount: billAmount, date: todayStr, note: `${monthStr} 自動扣繳`, outName: '自動扣繳', inName: '自動扣繳',
      })
    }
  }

  return {
    snapshot_date: yesterdayStr,
    today: todayStr,
    recurring_generated: recurringCount,
    snapshot: { total_assets: totalCash + totalInvestmentsValue, total_investments: totalInvestmentsValue },
  }
}
