import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Bindings } from './types'
import transactionsRoute from './routes/transactions'
import investmentsRoute from './routes/investments'
import summaryRoute from './routes/summary'
import reconcileRoute from './routes/reconcile'
import gmailRoute from './routes/gmail'
import assetsRoute from './routes/assets'
import categoriesRoute from './routes/categories'
import recurringRoute from './routes/recurring'
import authRoute from './routes/auth'
import { syncGmailWithDB } from './services/gmail'
import { upsertDailySummary, getTransactions, getCategories, getAssets, processRecurring, createTransfer } from './db/queries'

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// 登入端點不需要驗證
app.route('/api/auth', authRoute)

// 所有其他 /api/* 路由都需要 Bearer token
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()
  // cron 有自己的 CRON_SECRET 驗證
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
app.route('/api/gmail', gmailRoute)
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
  })
})

// Cron 端點：保護用
app.post('/api/cron/run', async (c) => {
  const secret = c.req.header('x-cron-secret')
  if (secret !== c.env.CRON_SECRET) {
    return c.json({ ok: false, error: 'Unauthorized' }, 401)
  }
  return runNightlyJob(c.env)
    .then(result => c.json({ ok: true, ...result }))
    .catch(e => c.json({ ok: false, error: String(e) }, 500))
})

// Cloudflare Scheduled Worker（每天 22:00 台北時間 = UTC 14:00）
export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(runNightlyJob(env))
  },
}

async function runNightlyJob(env: Bindings) {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, DB } = env

  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    return { skipped: true, reason: 'Gmail OAuth not configured' }
  }

  // 處理定期交易
  const recurringCount = await processRecurring(DB)

  // 自動扣繳：結算日當天，找出 payment_method='auto' 的信用卡並建立付款轉帳
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

  const result = await syncGmailWithDB(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, DB)

  const today = new Date().toISOString().slice(0, 10)

  // 取得今天所有消費（含已存在的）
  const { data: txns } = await getTransactions(DB, { date: today, limit: 100 })
  const totalAmount = txns.reduce((s, t) => s + t.amount, 0)
  const lines = txns.map(t => `• ${t.name} $${t.amount.toLocaleString()}（${t.category}）`)
  const summaryText = txns.length
    ? `📊 ${today} 消費摘要\n共 ${txns.length} 筆，總金額 NT$${totalAmount.toLocaleString()}\n\n${lines.join('\n')}\n\n已寫入系統 ✅`
    : `📊 ${today} 消費摘要\n今日無消費記錄`

  await upsertDailySummary(DB, today, {
    total_amount: totalAmount,
    transaction_count: txns.length,
    summary_text: summaryText,
  })

  return {
    date: today,
    recurring_generated: recurringCount,
    gmail_synced: result.synced,
    gmail_skipped: result.skipped,
    total_today: txns.length,
    summary: summaryText,
  }
}
