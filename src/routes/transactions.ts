import { Hono } from 'hono'
import type { Bindings } from '../types'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, createTransfer, deleteTransferPair } from '../db/queries'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
  const q = c.req.query()
  const result = await getTransactions(c.env.DB, {
    limit: q.limit ? parseInt(q.limit) : 50,
    offset: q.offset ? parseInt(q.offset) : 0,
    date: q.date,
    month: q.month,
    date_from: q.date_from,
    date_to: q.date_to,
    category: q.category,
    status: q.status,
    type: q.type,
    card: q.card,
  })
  return c.json({ ok: true, ...result })
})

app.post('/', async (c) => {
  const body = await c.req.json<{
    name: string; amount: number; date: string;
    category?: string; card?: string; type?: string; note?: string
  }>()

  if (!body.amount || !body.date) {
    return c.json({ ok: false, error: '缺少必填欄位：amount, date' }, 400)
  }

  const id = await createTransaction(c.env.DB, {
    name: body.name ?? '',
    amount: body.amount,
    date: body.date,
    category: body.category ?? '其他',
    card: body.card ?? '',
    type: body.type ?? '支出',
    status: '待確認',
    source: '手動輸入',
    note: body.note ?? null,
    transfer_id: null,
  })

  return c.json({ ok: true, id }, 201)
})

// 轉帳：同時建立兩筆關聯記錄
app.post('/transfer', async (c) => {
  const body = await c.req.json<{
    from_account: string; to_account: string; amount: number; date: string; note?: string; fee?: number
  }>()

  if (!body.from_account || !body.to_account || !body.amount || !body.date) {
    return c.json({ ok: false, error: '缺少必填欄位' }, 400)
  }
  if (body.from_account === body.to_account) {
    return c.json({ ok: false, error: '來源與目標帳戶不能相同' }, 400)
  }

  const transfer_id = await createTransfer(c.env.DB, {
    from_account: body.from_account,
    to_account: body.to_account,
    amount: body.amount,
    date: body.date,
    note: body.note,
    fee: body.fee,
  })

  return c.json({ ok: true, transfer_id }, 201)
})

app.patch('/transfer/:transferId', async (c) => {
  const transferId = c.req.param('transferId')
  const body = await c.req.json<{ amount?: number; date?: string; note?: string | null; from_account?: string; to_account?: string }>()

  const { results } = await c.env.DB
    .prepare('SELECT id, type, card FROM transactions WHERE transfer_id = ?')
    .bind(transferId).all<{ id: string; type: string; card: string }>()

  if (results.length < 2) return c.json({ ok: false, error: '找不到此轉帳記錄' }, 404)
  const outgoing = results.find(t => t.type === '支出')
  const incoming = results.find(t => t.type === '收入')
  if (!outgoing || !incoming) return c.json({ ok: false, error: '轉帳記錄不完整' }, 404)

  const fromAccount = body.from_account ?? outgoing.card
  const toAccount = body.to_account ?? incoming.card

  const base: Record<string, unknown> = {}
  if (body.amount !== undefined) base.amount = body.amount
  if (body.date !== undefined) base.date = body.date
  if ('note' in body) base.note = body.note

  await updateTransaction(c.env.DB, outgoing.id, { ...base, card: fromAccount, name: `轉帳 → ${toAccount}` })
  await updateTransaction(c.env.DB, incoming.id, { ...base, card: toAccount, name: `轉帳 ← ${fromAccount}` })

  return c.json({ ok: true })
})

app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{
    name?: string; amount?: number; date?: string;
    category?: string; card?: string; type?: string; status?: string; note?: string
  }>()

  const ok = await updateTransaction(c.env.DB, id, body)
  if (!ok) return c.json({ ok: false, error: '找不到此記錄' }, 404)
  return c.json({ ok: true })
})

app.delete('/:id', async (c) => {
  const id = c.req.param('id')

  // 查看是否為轉帳，若是則刪除整對
  const txn = await c.env.DB.prepare('SELECT transfer_id FROM transactions WHERE id = ?').bind(id).first<{ transfer_id: string | null }>()

  if (txn?.transfer_id) {
    await deleteTransferPair(c.env.DB, txn.transfer_id)
    return c.json({ ok: true, deleted_transfer: true })
  }

  const ok = await deleteTransaction(c.env.DB, id)
  if (!ok) return c.json({ ok: false, error: '找不到此記錄' }, 404)
  return c.json({ ok: true })
})

export default app
