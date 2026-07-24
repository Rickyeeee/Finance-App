import { Hono } from 'hono'
import type { Bindings } from '../types'
import { getRecurring, createRecurring, updateRecurring, deleteRecurring, processRecurring, createTransaction } from '../db/queries'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
  const data = await getRecurring(c.env.DB)
  return c.json({ ok: true, data })
})

app.post('/', async (c) => {
  const body = await c.req.json()
  const startDate = body.start_date || body.next_date
  if (!body.name || !body.amount || !body.category || !startDate) {
    return c.json({ ok: false, error: '缺少必填欄位' }, 400)
  }
  body.start_date = startDate
  body.next_date = startDate
  const id = await createRecurring(c.env.DB, body)
  return c.json({ ok: true, id })
})

app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const ok = await updateRecurring(c.env.DB, id, body)
  return c.json({ ok })
})

app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const ok = await deleteRecurring(c.env.DB, id)
  return c.json({ ok })
})

// 取得某定期項目的所有歷史交易
app.get('/:id/transactions', async (c) => {
  const id = c.req.param('id')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM transactions WHERE recurring_id = ? ORDER BY date DESC'
  ).bind(id).all()
  return c.json({ ok: true, data: results })
})

// 修改整個週期事件（只更新模板）
app.patch('/:id/template', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const ok = await updateRecurring(c.env.DB, id, body)
  return c.json({ ok })
})

// 修改連同未來週期（更新模板 + 這筆及之後的所有交易）
app.patch('/:id/future', async (c) => {
  const id = c.req.param('id')
  const { transaction_id, from_date, fee: feeRaw, ...templateData } = await c.req.json()
  const fee = feeRaw ?? 0
  // 更新定期模板（base amount + fee 分開）
  if (Object.keys(templateData).length) await updateRecurring(c.env.DB, id, { ...templateData, fee })
  // 更新這筆及之後所有同 recurring_id 的交易（amount 存總額）
  if (from_date) {
    const txnData: Record<string, unknown> = {}
    for (const f of ['name', 'category', 'card'] as const) {
      if (templateData[f] !== undefined) txnData[f] = templateData[f]
    }
    // amount：用 base + fee 算出總額
    if (templateData.amount !== undefined) txnData.amount = templateData.amount + fee
    // note：有 fee 就覆寫，否則保留 templateData.note
    txnData.note = fee > 0 ? `含手續費 $${fee.toLocaleString()}` : (templateData.note ?? null)

    const fields = Object.keys(txnData)
    if (fields.length) {
      const sets = fields.map(f => `${f} = ?`).join(', ')
      const vals = fields.map(f => txnData[f])
      await c.env.DB.prepare(
        `UPDATE transactions SET ${sets} WHERE recurring_id = ? AND date >= ?`
      ).bind(...vals, id, from_date).run()
    }
  }
  return c.json({ ok: true })
})

// 生成指定定期項目所有過期未生成的紀錄（新增時呼叫）
app.post('/:id/generate', async (c) => {
  const id = c.req.param('id')
  const { results } = await c.env.DB.prepare('SELECT * FROM recurring_transactions WHERE id = ?').bind(id).all<any>()
  const item = results[0]
  if (!item) return c.json({ ok: false, error: '找不到定期項目' }, 404)

  function calcNext(dateStr: string, frequency: string, dayOfMonth = 1): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    if (frequency === 'weekly') {
      const dt = new Date(y, m - 1, d + 7)
      return dt.toISOString().slice(0, 10)
    }
    if (frequency === 'yearly') {
      const maxD = new Date(y + 1, m, 0).getDate()
      return `${y + 1}-${String(m).padStart(2, '0')}-${String(Math.min(d, maxD)).padStart(2, '0')}`
    }
    let ny = y, nm = m + 1
    if (nm > 12) { nm = 1; ny++ }
    const maxD = new Date(ny, nm, 0).getDate()
    return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(dayOfMonth, maxD)).padStart(2, '0')}`
  }

  const fee = item.fee ?? 0
  const cardName = item.card ?? ''
  const assetRow = cardName
    ? await c.env.DB.prepare('SELECT id FROM assets WHERE name = ? LIMIT 1').bind(cardName).first<{ id: string }>()
    : null
  const accountId = assetRow?.id ?? null

  const today = new Date().toISOString().slice(0, 10)
  const body = await c.req.json().catch(() => ({}))

  // 只生成單一指定日期（用於「只改這筆」：把某個「即將到來」的日期單獨生成一筆，
  // 不動 next_date，讓中間還沒到期的日期維持原樣，不會被提前生成）
  const onlyDate = (body as any).only_date
  if (onlyDate) {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM transactions WHERE recurring_id = ? AND date = ? LIMIT 1'
    ).bind(id, onlyDate).first<{ id: string }>()
    if (existing) return c.json({ ok: true, id: existing.id, count: 0 })

    const txnId = await createTransaction(c.env.DB, {
      name: item.name,
      amount: item.amount + fee,
      date: onlyDate,
      category: item.category,
      card: cardName,
      account_id: accountId,
      type: item.type,
      status: '待確認',
      source: '定期',
      note: fee > 0 ? `含手續費 $${fee.toLocaleString()}` : (item.note ?? null),
      transfer_id: null,
      recurring_id: item.id,
    })
    return c.json({ ok: true, id: txnId, count: 1 })
  }

  const until = (body as any).until_date ?? today
  let nd: string = item.next_date
  let count = 0

  while (nd <= until && count < 120) {
    const exists = await c.env.DB.prepare(
      'SELECT id FROM transactions WHERE recurring_id = ? AND date = ? LIMIT 1'
    ).bind(id, nd).first()

    if (!exists) {
      await createTransaction(c.env.DB, {
        name: item.name,
        amount: item.amount + fee,
        date: nd,
        category: item.category,
        card: cardName,
        account_id: accountId,
        type: item.type,
        status: '待確認',
        source: '定期',
        note: fee > 0 ? `含手續費 $${fee.toLocaleString()}` : (item.note ?? null),
        transfer_id: null,
        recurring_id: item.id,
      })
      count++
    }
    nd = calcNext(nd, item.frequency, item.day_of_month)
  }

  await updateRecurring(c.env.DB, id, { next_date: nd, last_generated: today })
  return c.json({ ok: true, count })
})

// 終止未來週期：標記停用 + end_date=今天 + 刪未來待確認交易，保留歷史模板
app.delete('/:id/terminate', async (c) => {
  const id = c.req.param('id')
  const today = new Date().toISOString().slice(0, 10)
  await c.env.DB.prepare(
    "DELETE FROM transactions WHERE recurring_id = ? AND date > ? AND status = '待確認'"
  ).bind(id, today).run()
  const ok = await updateRecurring(c.env.DB, id, { is_active: 0, end_date: today })
  return c.json({ ok })
})

// 手動觸發：立即生成所有到期的定期記錄
app.post('/process', async (c) => {
  const count = await processRecurring(c.env.DB)
  return c.json({ ok: true, count })
})

export default app
