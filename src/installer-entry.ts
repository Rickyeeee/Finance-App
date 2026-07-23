/**
 * Installer Entry — 朋友的 Worker 版本
 * 靜態檔案 proxy 回原始 Worker，API 使用自己的 D1
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings } from './types'
import transactionsRoute from './routes/transactions'
import investmentsRoute from './routes/investments'
import summaryRoute from './routes/summary'
import reconcileRoute from './routes/reconcile'
import assetsRoute from './routes/assets'
import categoriesRoute from './routes/categories'
import recurringRoute from './routes/recurring'
import authRoute from './routes/auth'
import { processRecurring, getAssets, getInvestments, getMonthlySummary, recordAssetSnapshot, getTransactions, upsertDailySummary, createTransfer } from './db/queries'

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// 公開端點
app.get('/api/app-config', async (c) => {
  try {
    const row = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('app_name').first<{ value: string }>()
    const app_name = row?.value || c.env.APP_NAME || '我的財務'
    return c.json({ app_name })
  } catch {
    return c.json({ app_name: c.env.APP_NAME || '我的財務' })
  }
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

// 登入不需要驗證
app.route('/api/auth', authRoute)

// 所有其他 /api/* 需要 Bearer token
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()
  if (c.req.path === '/api/cron/run') return next()
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

app.post('/api/self-update', async (c) => {
  const token = c.env.CF_API_TOKEN
  const workerName = c.env.WORKER_NAME
  if (!token || !workerName) {
    return c.json({ ok: false, error: '此版本不支援一鍵更新，請重新安裝' }, 400)
  }
  const bundleRes = await fetch((c.env.STATIC_ORIGIN || 'https://ricky-finance.ke877857.workers.dev') + '/installer-worker.js')
  if (!bundleRes.ok) {
    return c.json({ ok: false, error: '無法取得最新版本' }, 502)
  }
  const bundle = await bundleRes.text()

  const upstream = (c.env.STATIC_ORIGIN || 'https://ricky-finance.ke877857.workers.dev') + '/api/installer/update'
  const res = await fetch(upstream, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_token: token, worker_name: workerName, bundle }),
  })

  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'text/event-stream' },
  })
})

app.route('/api/transactions', transactionsRoute)
app.route('/api/investments', investmentsRoute)
app.route('/api/summary', summaryRoute)
app.route('/api/reconcile', reconcileRoute)
app.route('/api/assets', assetsRoute)
app.route('/api/categories', categoriesRoute)
app.route('/api/recurring', recurringRoute)

app.get('/api/shortcut/data', async (c) => {
  const { getCategories } = await import('./db/queries')
  const [cats, assets] = await Promise.all([getCategories(c.env.DB), getAssets(c.env.DB)])
  const expCats = cats.filter(ct => ct.type !== '收入')
  const incCats = cats.filter(ct => ct.type === '收入')
  return c.json({
    expense_categories: expCats.map(ct => ct.name),
    income_categories:  incCats.map(ct => ct.name),
    accounts: assets.filter(a => a.type !== '投資帳戶').map(a => a.name),
    expense_category_objects: expCats.map(ct => ({ name: ct.name, icon: ct.icon ?? null })),
    income_category_objects:  incCats.map(ct => ({ name: ct.name, icon: ct.icon ?? null })),
  })
})

app.post('/api/cron/run', async (c) => {
  const secret = c.req.header('x-cron-secret')
  if (secret !== c.env.CRON_SECRET) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }
  return runNightlyJob(c.env)
    .then(result => c.json({ ok: true, ...result }))
    .catch(e => c.json({ ok: false, error: String(e) }, 500))
})

// 靜態檔案：proxy 回 Ricky 的靜態站（cross-account fetch 可正常運作）
app.all('*', async (c) => {
  const origin = c.env.STATIC_ORIGIN || 'https://ricky-finance.ke877857.workers.dev'
  const url = new URL(c.req.url)
  try {
    const res = await fetch(origin + url.pathname + url.search)
    const contentType = res.headers.get('Content-Type') || 'text/html; charset=utf-8'
    return new Response(res.body, {
      status: res.status,
      headers: { 'Content-Type': contentType },
    })
  } catch {
    return c.text('載入失敗，請稍後再試', 502)
  }
})

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    // 沒有 .catch() 的話這裡拋錯只會變成無聲的 unhandled rejection，log 裡完全找不到線索
    ctx.waitUntil(runNightlyJob(env).catch(e => console.error('[cron] runNightlyJob 失敗：', e)))
  },
}

async function runNightlyJob(env: Bindings) {
  const DB = env.DB
  const today = new Date().toISOString().slice(0, 10)

  // 資產快照最重要也最沒辦法事後補救（快照記的是當下市值，過了那天就永遠拿不回來），
  // 放在最前面、獨立包一層 try/catch，不讓它被後面任何步驟的錯誤連累到沒執行
  try {
    const [allAssetsSnap, allInvestmentsSnap] = await Promise.all([getAssets(DB), getInvestments(DB)])
    const monthKey = today.slice(0, 7)
    const { total: monthlyExpense } = await getMonthlySummary(DB, monthKey)
    const totalCash = allAssetsSnap.filter(a => a.type === '銀行' || a.type === '現金' || a.type === '銀行存款').reduce((s, a) => s + a.balance, 0)
    const totalInvestmentsValue = allInvestmentsSnap.reduce((s, i) => s + i.market_value, 0)
    await recordAssetSnapshot(DB, { snapshot_date: today, total_assets: totalCash + totalInvestmentsValue, total_investments: totalInvestmentsValue, total_cash: totalCash, monthly_expense: monthlyExpense })
  } catch (e) {
    console.error('[cron] 資產快照記錄失敗，' + today + ' 這天將永久缺資料：', e)
  }

  const recurringCount = await processRecurring(DB)

  const taiwanNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  const todayDay = taiwanNow.getDate()
  const todayStr = `${taiwanNow.getFullYear()}-${String(taiwanNow.getMonth()+1).padStart(2,'0')}-${String(taiwanNow.getDate()).padStart(2,'0')}`
  const allAssets = await getAssets(DB)

  for (const cc of allAssets) {
    if (cc.type !== '信用卡' || cc.payment_method !== 'auto' || !cc.payment_account || cc.billing_day !== todayDay) continue
    const y = taiwanNow.getFullYear(), m = taiwanNow.getMonth() + 1
    const monthStr = `${y}-${String(m).padStart(2,'0')}`
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const periodStart = fmt(new Date(y, m - 2, cc.billing_day + 1))
    const { data: txns } = await getTransactions(DB, { date_from: periodStart, date_to: todayStr, card: cc.name, limit: 1000 })
    const billAmount = txns.filter(t => t.type !== '收入' && !t.transfer_id).reduce((s, t) => s + t.amount, 0)
    if (billAmount > 0) {
      await createTransfer(DB, {
        from_account: cc.payment_account, from_account_id: cc.payment_account_id,
        to_account: cc.name, to_account_id: cc.id,
        amount: billAmount, date: todayStr, note: `${monthStr} 自動扣繳`, outName: '自動扣繳', inName: '自動扣繳',
      })
    }
  }

  const { data: txns } = await getTransactions(DB, { date: today, limit: 100 })
  const totalAmount = txns.reduce((s, t) => s + t.amount, 0)
  const summaryText = txns.length
    ? `📊 ${today} 消費摘要\n共 ${txns.length} 筆，總金額 NT$${totalAmount.toLocaleString()}`
    : `📊 ${today} 消費摘要\n今日無消費記錄`

  await upsertDailySummary(DB, today, {
    total_amount: totalAmount,
    transaction_count: txns.length,
    summary_text: summaryText,
  })

  return { date: today, recurring_generated: recurringCount }
}
