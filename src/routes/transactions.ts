import { Hono } from 'hono'
import type { Bindings } from '../types'
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, createTransfer, deleteTransferPair, getInvestmentTrades, getInvestments, deleteInvestmentTrade, upsertInvestment, deleteInvestment } from '../db/queries'
import type { InvestmentTrade } from '../types'

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
    account_id: q.account_id,
  })
  return c.json({ ok: true, ...result })
})

app.get('/:id', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first()
  if (!row) return c.json({ ok: false, error: '找不到記錄' }, 404)
  return c.json({ ok: true, data: row })
})

app.post('/', async (c) => {
  const body = await c.req.json<{
    name: string; amount: number; date: string;
    category?: string; card?: string; account_id?: string; type?: string; note?: string
  }>()

  if (!body.amount || !body.date) {
    return c.json({ ok: false, error: '缺少必填欄位：amount, date' }, 400)
  }

  // 若沒傳 account_id，嘗試從帳戶名稱反查
  let accountId = body.account_id ?? null
  if (!accountId && body.card) {
    const found = await c.env.DB.prepare('SELECT id FROM assets WHERE name = ?').bind(body.card).first<{ id: string }>()
    accountId = found?.id ?? null
  }

  const id = await createTransaction(c.env.DB, {
    name: body.name ?? '',
    amount: body.amount,
    date: body.date,
    category: body.category ?? '其他',
    card: body.card ?? '',
    account_id: accountId,
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
    from_account_id?: string; to_account_id?: string
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
    from_account_id: body.from_account_id ?? null,
    to_account_id: body.to_account_id ?? null,
    amount: body.amount,
    date: body.date,
    note: body.note,
    fee: body.fee,
  })

  return c.json({ ok: true, transfer_id }, 201)
})

app.patch('/transfer/:transferId', async (c) => {
  const transferId = c.req.param('transferId')
  const body = await c.req.json<{
    amount?: number; date?: string; note?: string | null
    from_account?: string; to_account?: string; from_account_id?: string; to_account_id?: string
  }>()

  const { results } = await c.env.DB
    .prepare('SELECT id, type, card, account_id, name FROM transactions WHERE transfer_id = ?')
    .bind(transferId).all<{ id: string; type: string; card: string; account_id: string | null; name: string }>()

  if (results.length < 2) return c.json({ ok: false, error: '找不到此轉帳記錄' }, 404)
  const outgoing = results.find(t => t.type === '支出')
  const incoming = results.find(t => t.type === '收入')
  if (!outgoing || !incoming) return c.json({ ok: false, error: '轉帳記錄不完整' }, 404)

  const fromAccount = body.from_account ?? outgoing.card
  const toAccount = body.to_account ?? incoming.card
  const fromAccountId = body.from_account_id !== undefined ? body.from_account_id : outgoing.account_id
  const toAccountId = body.to_account_id !== undefined ? body.to_account_id : incoming.account_id

  const base: Record<string, unknown> = {}
  if (body.amount !== undefined) base.amount = body.amount
  if (body.date !== undefined) base.date = body.date
  if ('note' in body) base.note = body.note

  // 只在預設名稱時才更新，保留自訂名稱（如投資賣出）
  const outName = outgoing.name?.startsWith('轉帳') ? `轉帳 → ${toAccount}` : outgoing.name
  const inName  = incoming.name?.startsWith('轉帳') ? `轉帳 ← ${fromAccount}` : incoming.name
  await updateTransaction(c.env.DB, outgoing.id, { ...base, card: fromAccount, account_id: fromAccountId, name: outName })
  await updateTransaction(c.env.DB, incoming.id, { ...base, card: toAccount, account_id: toAccountId, name: inName })

  return c.json({ ok: true })
})

app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{
    name?: string; amount?: number; date?: string;
    category?: string; card?: string; account_id?: string | null; type?: string; status?: string; note?: string
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
    // 檢查是否有關聯的投資交易（賣出產生的轉帳）
    const linkedTrade = await c.env.DB
      .prepare('SELECT * FROM investment_trades WHERE transfer_id = ?')
      .bind(txn.transfer_id)
      .first<InvestmentTrade>()

    if (linkedTrade) {
      // 有關聯投資交易 → 刪除交易 + 轉帳 + 還原股票持倉
      const allForPair = await getInvestmentTrades(c.env.DB, linkedTrade.symbol, linkedTrade.account)
      const allInv = await getInvestments(c.env.DB)

      await deleteInvestmentTrade(c.env.DB, linkedTrade.id)
      await deleteTransferPair(c.env.DB, txn.transfer_id)

      const remaining = allForPair.filter(t => t.id !== linkedTrade.id)
      const inv = allInv.find(i => i.symbol === linkedTrade.symbol && i.account === linkedTrade.account)
      const today = new Date().toISOString().slice(0, 10)

      if (remaining.length === 0) {
        if (inv) await deleteInvestment(c.env.DB, inv.id)
        return c.json({ ok: true })
      }

      const sorted = [...remaining].sort((a, b) => a.date.localeCompare(b.date))
      let shares = 0, avgCost = 0, realizedPnl = 0
      for (const t of sorted) {
        if (t.type === '買入') {
          const newShares = shares + t.shares
          avgCost = newShares > 0 ? (shares * avgCost + t.shares * t.price) / newShares : t.price
          shares = newShares
        } else {
          realizedPnl += (t.price - avgCost) * t.shares
          shares = Math.max(0, shares - t.shares)
        }
      }

      if (shares === 0) {
        if (inv) await deleteInvestment(c.env.DB, inv.id)
        return c.json({ ok: true })
      }

      const currentPerShare = inv
        ? (inv.current_price || (inv.shares > 0 ? inv.market_value / inv.shares : avgCost))
        : avgCost
      const newMarketValue = Math.round(shares * currentPerShare)
      const newTotalCost = Math.round(shares * avgCost)
      const newProfitLoss = newMarketValue - newTotalCost
      const newReturnRate = newTotalCost > 0 ? Math.round((newProfitLoss / newTotalCost) * 10000) / 100 : 0

      await upsertInvestment(c.env.DB, {
        ...(inv ?? { id: undefined, name: linkedTrade.name, symbol: linkedTrade.symbol, account: linkedTrade.account, current_price: avgCost, previous_close: 0 }),
        shares, avg_cost: Math.round(avgCost * 100) / 100,
        market_value: newMarketValue, profit_loss: newProfitLoss,
        return_rate: newReturnRate, realized_pnl: Math.round(realizedPnl), updated_at: today,
      })
      return c.json({ ok: true })
    }

    // 一般轉帳（無投資關聯）→ 只刪轉帳對
    await deleteTransferPair(c.env.DB, txn.transfer_id)
    return c.json({ ok: true, deleted_transfer: true })
  }

  const ok = await deleteTransaction(c.env.DB, id)
  if (!ok) return c.json({ ok: false, error: '找不到此記錄' }, 404)
  return c.json({ ok: true })
})

export default app
