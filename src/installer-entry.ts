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
app.get('/api/app-config', (c) => {
  return c.json({ app_name: c.env.APP_NAME || '我的財務' })
})

// 動態 manifest.json
app.get('/manifest.json', (c) => {
  const appName = c.env.APP_NAME || '我的財務'
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

// 靜態檔案：proxy 回原始 Worker
app.all('*', async (c) => {
  const origin = c.env.STATIC_ORIGIN || 'https://ricky-finance.ke877857.workers.dev'
  const url = new URL(c.req.url)
  try {
    const res = await fetch(origin + url.pathname + url.search, {
      headers: { 'User-Agent': 'installer-proxy/1.0' },
    })
    const contentType = res.headers.get('Content-Type') || 'text/html; charset=utf-8'
    return new Response(res.body, {
      status: res.status,
      headers: { 'Content-Type': contentType },
    })
  } catch {
    return c.text('靜態資源載入失敗，請確認原始服務正常運作', 502)
  }
})

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(runNightlyJob(env))
  },
}

async function runNightlyJob(env: Bindings) {
  const DB = env.DB
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
      await createTransfer(DB, { from_account: cc.payment_account, to_account: cc.name, amount: billAmount, date: todayStr, note: `${monthStr} 自動扣繳`, outName: '自動扣繳', inName: '自動扣繳' })
    }
  }

  const today = new Date().toISOString().slice(0, 10)
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

  const [allAssetsSnap, allInvestmentsSnap] = await Promise.all([getAssets(DB), getInvestments(DB)])
  const monthKey = today.slice(0, 7)
  const { total: monthlyExpense } = await getMonthlySummary(DB, monthKey)
  const totalCash = allAssetsSnap.filter(a => a.type === '銀行' || a.type === '現金' || a.type === '銀行存款').reduce((s, a) => s + a.balance, 0)
  const totalInvestmentsValue = allInvestmentsSnap.reduce((s, i) => s + i.market_value, 0)
  await recordAssetSnapshot(DB, { snapshot_date: today, total_assets: totalCash + totalInvestmentsValue, total_investments: totalInvestmentsValue, total_cash: totalCash, monthly_expense: monthlyExpense })

  return { date: today, recurring_generated: recurringCount }
}
