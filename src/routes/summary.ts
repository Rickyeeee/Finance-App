import { Hono } from 'hono'
import type { Bindings } from '../types'
import { getDailySummary, getMonthlySummary, getTransactions } from '../db/queries'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/daily', async (c) => {
  const date = c.req.query('date') ?? new Date().toISOString().slice(0, 10)
  const summary = await getDailySummary(c.env.DB, date)

  if (summary) {
    return c.json({ ok: true, data: summary })
  }

  // 若沒有快取，即時計算
  const { data: txns } = await getTransactions(c.env.DB, { date, limit: 100 })
  const total = txns.reduce((s, t) => s + t.amount, 0)
  const lines = txns.map(t => `• ${t.name} $${t.amount.toLocaleString()}（${t.category}）`)
  const summaryText = txns.length
    ? `📊 ${date} 消費摘要\n共 ${txns.length} 筆，總金額 NT$${total.toLocaleString()}\n\n${lines.join('\n')}\n\n已寫入系統 ✅`
    : `📊 ${date} 消費摘要\n今日無消費記錄`

  return c.json({
    ok: true,
    data: {
      date,
      total_amount: total,
      transaction_count: txns.length,
      summary_text: summaryText,
    },
  })
})

app.get('/monthly', async (c) => {
  const now = new Date()
  const month = c.req.query('month') ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const summary = await getMonthlySummary(c.env.DB, month)

  // 計算上月數據做比較
  const [y, m] = month.split('-').map(Number)
  const prevDate = new Date(y, m - 2, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const prevSummary = await getMonthlySummary(c.env.DB, prevMonth)

  return c.json({
    ok: true,
    month,
    data: summary,
    prev_month: prevMonth,
    prev_total: prevSummary.total,
    change: summary.total - prevSummary.total,
  })
})

export default app
