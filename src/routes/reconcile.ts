import { Hono } from 'hono'
import type { Bindings } from '../types'
import {
  getReconciliations, createReconciliationItem, updateReconciliationItem,
  getTransactions, createTransaction, updateTransaction, createTransfer
} from '../db/queries'
import { parseSinopacBillText } from '../services/csv-parser'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
  const billMonth = c.req.query('month')
  const items = await getReconciliations(c.env.DB, billMonth)

  const stats = {
    total: items.length,
    matched: items.filter(i => i.status === '吻合').length,
    amount_mismatch: items.filter(i => i.status === '金額不符').length,
    no_record: items.filter(i => i.status === '無記錄').length,
    deferred: items.filter(i => i.status === '延後入帳').length,
  }

  return c.json({ ok: true, data: items, stats })
})

// 上傳帳單文字
app.post('/upload', async (c) => {
  const body = await c.req.json<{ text: string; bill_month: string }>()

  if (!body.text || !body.bill_month) {
    return c.json({ ok: false, error: '缺少 text 或 bill_month' }, 400)
  }

  const billItems = parseSinopacBillText(body.text)
  if (!billItems.length) {
    return c.json({ ok: false, error: '無法從帳單文字中解析出消費記錄' }, 400)
  }

  // 刪除該月舊的對帳記錄，重新比對
  await c.env.DB.prepare('DELETE FROM reconciliation WHERE bill_month = ?').bind(body.bill_month).run()

  const [y, m] = body.bill_month.split('-').map(Number)
  // 永豐結算日 9 號，帳單包含前月 10 號到本月 9 號的消費
  const startDate = new Date(y, m - 2, 10)
  const endDate = new Date(y, m - 1, 9)
  const startStr = startDate.toISOString().slice(0, 10)
  const endStr = endDate.toISOString().slice(0, 10)

  const { data: systemTxns } = await getTransactions(c.env.DB, { limit: 500 })
  const periodTxns = systemTxns.filter(t => t.date >= startStr && t.date <= endStr && t.card.startsWith('永豐') && t.type !== '收入')

  let matched = 0, mismatch = 0, noRecord = 0
  let totalBillAmount = 0

  for (const item of billItems) {
    totalBillAmount += item.amount

    const exactMatch = periodTxns.find(t =>
      t.date === item.date && t.amount === item.amount && t.status !== '已對帳'
    )

    if (exactMatch) {
      await createReconciliationItem(c.env.DB, {
        name: item.name,
        bill_amount: item.amount,
        record_amount: exactMatch.amount,
        date: item.date,
        category: exactMatch.category,
        status: '吻合',
        bill_month: body.bill_month,
        transaction_id: exactMatch.id,
        note: null,
      })
      // 正確：更新 transaction 狀態，而非 reconciliation item
      await updateTransaction(c.env.DB, exactMatch.id, { status: '已對帳' })
      matched++
    } else {
      const nameMatch = periodTxns.find(t =>
        t.name.includes(item.name.slice(0, 4)) || item.name.includes(t.name.slice(0, 4))
      )

      if (nameMatch) {
        await createReconciliationItem(c.env.DB, {
          name: item.name,
          bill_amount: item.amount,
          record_amount: nameMatch.amount,
          date: item.date,
          category: nameMatch.category,
          status: '金額不符',
          bill_month: body.bill_month,
          transaction_id: nameMatch.id,
          note: `帳單 $${item.amount}，系統記錄 $${nameMatch.amount}`,
        })
        mismatch++
      } else {
        const newId = await createTransaction(c.env.DB, {
          name: item.name,
          amount: item.amount,
          date: item.date,
          category: '其他',
          card: '永豐',
          type: '支出',
          status: '已對帳',
          source: '帳單補記',
          note: `從 ${body.bill_month} 帳單自動補記`,
          transfer_id: null,
        })
        await createReconciliationItem(c.env.DB, {
          name: item.name,
          bill_amount: item.amount,
          record_amount: null,
          date: item.date,
          category: '其他',
          status: '無記錄',
          bill_month: body.bill_month,
          transaction_id: newId,
          note: '已自動補記',
        })
        noRecord++
      }
    }
  }

  return c.json({
    ok: true,
    bill_month: body.bill_month,
    total: billItems.length,
    matched,
    mismatch,
    no_record: noRecord,
    total_bill_amount: totalBillAmount,
  })
})

// 延後入帳：把 transaction 日期推到下期，reconciliation 標記為延後
app.post('/:id/defer', async (c) => {
  const id = c.req.param('id')
  const { new_date } = await c.req.json<{ new_date: string }>()
  if (!new_date) return c.json({ ok: false, error: '缺少 new_date' }, 400)

  const item = await c.env.DB.prepare('SELECT * FROM reconciliation WHERE id = ?').bind(id).first<{ transaction_id: string | null }>()
  if (!item) return c.json({ ok: false, error: '找不到此對帳記錄' }, 404)

  if (item.transaction_id) {
    await updateTransaction(c.env.DB, item.transaction_id, { date: new_date, status: '待確認' })
  }
  await updateReconciliationItem(c.env.DB, id, { status: '延後入帳', note: `延後至 ${new_date}` } as Parameters<typeof updateReconciliationItem>[2])

  return c.json({ ok: true })
})

// 新增信用卡付款（轉帳）
app.post('/payment', async (c) => {
  const { from_account, to_account, amount, date, bill_month } = await c.req.json<{
    from_account: string; to_account: string; amount: number; date: string; bill_month: string
  }>()

  if (!from_account || !to_account || !amount || !date) {
    return c.json({ ok: false, error: '缺少必填欄位' }, 400)
  }

  const transfer_id = await createTransfer(c.env.DB, {
    from_account,
    to_account,
    amount,
    date,
    note: `${bill_month ?? ''} 信用卡帳單付款`,
    outName: '手動繳款',
    inName: '手動繳款',
  })

  return c.json({ ok: true, transfer_id })
})

// 手動更新對帳狀態
app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ status?: string; note?: string }>()
  const ok = await updateReconciliationItem(c.env.DB, id, body as Parameters<typeof updateReconciliationItem>[2])
  if (!ok) return c.json({ ok: false, error: '找不到此記錄' }, 404)
  return c.json({ ok: true })
})

export default app
