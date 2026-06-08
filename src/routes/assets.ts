import { Hono } from 'hono'
import type { Bindings } from '../types'
import { getAssets, createAsset, updateAssetFull, getAssetById, deleteAsset, getInvestments, getMonthlySummary, getAssetHistory, recordAssetSnapshot, createTransaction } from '../db/queries'

const ACCOUNT_TYPES = ['銀行', '證券戶', '信用卡', '現金'] as const

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
  const [assets, investments] = await Promise.all([
    getAssets(c.env.DB),
    getInvestments(c.env.DB),
  ])

  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { total: monthlyExpense, income: monthlyIncome } = await getMonthlySummary(c.env.DB, month)

  // 銀行+現金算現金部位，信用卡為負債，證券戶從 investments 取市值
  const included = assets.filter(a => a.include_in_total !== 0)
  const cashAccounts = included.filter(a => a.type === '銀行' || a.type === '現金' || a.type === '銀行存款')
  const creditAccounts = included.filter(a => a.type === '信用卡')
  const brokerAccounts = included.filter(a => a.type === '證券戶' || a.type === '投資帳戶')

  const totalCash = cashAccounts.reduce((s, a) => s + a.balance, 0)
  // 信用卡餘額為負值（負債），直接加總（負數）
  const creditBalance = creditAccounts.reduce((s, a) => s + a.balance, 0)

  // 證券戶若有對應投資資料，取市值；否則用帳戶餘額
  const brokerNames = new Set(brokerAccounts.map(a => a.name))
  const includedInvTotal = investments
    .filter(i => brokerNames.size === 0 || brokerNames.has(i.account))
    .reduce((s, i) => s + i.market_value, 0)
  const totalInvestments = brokerAccounts.length > 0 ? includedInvTotal : 0

  const investmentPnL = investments.reduce((s, i) => s + i.profit_loss, 0)

  return c.json({
    ok: true,
    data: {
      total_net_worth: totalCash + totalInvestments + creditBalance,
      total_cash: totalCash,
      total_investments: totalInvestments,
      total_credit_used: Math.abs(creditBalance),
      investment_pnl: investmentPnL,
      monthly_expense: monthlyExpense,
      monthly_income: monthlyIncome,
      accounts: assets,
      investments,
    },
  })
})

// 新增帳戶
app.post('/', async (c) => {
  const body = await c.req.json<{ name: string; type: string; bank?: string; balance?: number; include_in_total?: number; billing_day?: number | null; payment_day?: number | null; credit_limit?: number | null }>()

  if (!body.name || !body.type) {
    return c.json({ ok: false, error: '缺少 name 或 type' }, 400)
  }
  if (!ACCOUNT_TYPES.includes(body.type as typeof ACCOUNT_TYPES[number]) &&
      body.type !== '銀行存款' && body.type !== '投資帳戶') {
    return c.json({ ok: false, error: `type 必須是：${ACCOUNT_TYPES.join('、')}` }, 400)
  }

  const id = await createAsset(c.env.DB, {
    name: body.name,
    type: body.type,
    bank: body.bank ?? '',
    balance: body.balance ?? 0,
    include_in_total: body.include_in_total ?? 1,
    billing_day: body.billing_day ?? null,
    payment_day: body.payment_day ?? null,
    credit_limit: body.credit_limit ?? null,
  })

  return c.json({ ok: true, id }, 201)
})

// 編輯帳戶（名稱、類別、餘額），餘額有變動時自動補一筆調整記錄
app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ name?: string; type?: string; balance?: number; include_in_total?: number; billing_day?: number | null; payment_day?: number | null; credit_limit?: number | null; payment_method?: string | null; payment_account?: string | null }>()

  const before = await getAssetById(c.env.DB, id)
  if (!before) return c.json({ ok: false, error: '找不到此帳戶' }, 404)

  const updated = await updateAssetFull(c.env.DB, id, {
    name: body.name,
    type: body.type,
    balance: body.balance,
    include_in_total: body.include_in_total,
    ...('billing_day' in body ? { billing_day: body.billing_day } : {}),
    ...('payment_day' in body ? { payment_day: body.payment_day } : {}),
    ...('credit_limit' in body ? { credit_limit: body.credit_limit } : {}),
    ...('payment_method' in body ? { payment_method: body.payment_method } : {}),
    ...('payment_account' in body ? { payment_account: body.payment_account } : {}),
  })
  if (!updated) return c.json({ ok: false, error: '更新失敗' }, 500)

  if (body.balance !== undefined && body.balance !== before.balance) {
    const diff = body.balance - before.balance
    const today = new Date().toISOString().slice(0, 10)
    const accountName = body.name ?? before.name
    await createTransaction(c.env.DB, {
      name: `調整餘額｜${accountName}`,
      amount: Math.abs(diff),
      date: today,
      category: '其他',
      card: before.name,
      type: diff >= 0 ? '收入' : '支出',
      status: '已對帳',
      source: '餘額調整',
      note: `餘額從 ${before.balance.toLocaleString()} → ${body.balance.toLocaleString()}（${diff >= 0 ? '+' : ''}${diff.toLocaleString()}）`,
      transfer_id: null,
    })
  }

  return c.json({ ok: true, before: before.balance, after: updated.balance })
})

// 刪除帳戶
app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const ok = await deleteAsset(c.env.DB, id)
  if (!ok) return c.json({ ok: false, error: '找不到此帳戶' }, 404)
  return c.json({ ok: true })
})

// 資產歷史趨勢
app.get('/history', async (c) => {
  const months = parseInt(c.req.query('months') ?? '12')
  const history = await getAssetHistory(c.env.DB, months)
  return c.json({ ok: true, data: history })
})

// 資產快照
app.post('/snapshot', async (c) => {
  const [assets, investments] = await Promise.all([
    getAssets(c.env.DB),
    getInvestments(c.env.DB),
  ])

  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { total: monthlyExpense } = await getMonthlySummary(c.env.DB, month)

  const totalCash = assets.filter(a => a.type === '銀行' || a.type === '現金' || a.type === '銀行存款')
    .reduce((s, a) => s + a.balance, 0)
  const totalInvestments = investments.reduce((s, i) => s + i.market_value, 0)

  await recordAssetSnapshot(c.env.DB, {
    snapshot_date: now.toISOString().slice(0, 10),
    total_assets: totalCash + totalInvestments,
    total_investments: totalInvestments,
    total_cash: totalCash,
    monthly_expense: monthlyExpense,
  })

  return c.json({ ok: true })
})

export default app
