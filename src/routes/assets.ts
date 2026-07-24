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

  const totalCash = cashAccounts.reduce((s, a) => s + a.balance, 0)
  // 信用卡餘額為負值（負債），直接加總（負數）
  const creditBalance = creditAccounts.reduce((s, a) => s + a.balance, 0)

  // 投資市值／損益：「計入總資產」只決定要不要算進總資產淨值，不代表這筆投資
  // 不存在——這裡一律用「所有」證券戶（不篩 include_in_total），不然把證券戶
  // 設成不計入總資產後，投資市值卡片會直接歸零（曾經踩過這個坑）
  const allBrokerAccounts = assets.filter(a => a.type === '證券戶' || a.type === '投資帳戶')
  const allBrokerNames = new Set(allBrokerAccounts.map(a => a.name))
  const relevantInvestments = investments.filter(i => allBrokerNames.size === 0 || allBrokerNames.has(i.account))
  const totalInvestments = allBrokerAccounts.length > 0
    ? relevantInvestments.reduce((s, i) => s + i.market_value, 0)
    : 0
  const investmentPnL = relevantInvestments.reduce((s, i) => s + i.profit_loss, 0)

  // 總資產淨值：只有「計入總資產」的證券戶市值才算進去
  const includedBrokerNames = new Set(
    included.filter(a => a.type === '證券戶' || a.type === '投資帳戶').map(a => a.name)
  )
  const netWorthInvestments = allBrokerNames.size === 0
    ? relevantInvestments.reduce((s, i) => s + i.market_value, 0)
    : investments.filter(i => includedBrokerNames.has(i.account)).reduce((s, i) => s + i.market_value, 0)

  return c.json({
    ok: true,
    data: {
      total_net_worth: totalCash + netWorthInvestments + creditBalance,
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
// 帳戶名稱唯一性只在「同類別」內檢查——跨類別同名是合理情況（例如同一家銀行
// 同時有銀行帳戶和證券戶，都叫「國泰」），只有同類別同名才會讓餘額調整的
// 名稱比對邏輯搞不清楚該打中哪一筆
const TYPE_GROUP: Record<string, string> = {
  '銀行': '銀行', '銀行存款': '銀行',
  '證券戶': '證券戶', '投資帳戶': '證券戶',
  '信用卡': '信用卡', '現金': '現金',
}
function typeGroup(type: string) { return TYPE_GROUP[type] ?? type }

// 結算日/扣款日只能是 1-31（不存在的日期由前端「下個有效日」邏輯處理，這裡擋源頭）
function isValidDay(day: number | null | undefined) {
  return day == null || (Number.isInteger(day) && day >= 1 && day <= 31)
}

async function findDuplicateInGroup(db: D1Database, name: string, type: string, excludeId?: string) {
  const { results } = await db.prepare('SELECT id, type FROM assets WHERE name = ?' + (excludeId ? ' AND id != ?' : ''))
    .bind(...(excludeId ? [name, excludeId] : [name])).all<{ id: string; type: string }>()
  return results.find(a => typeGroup(a.type) === typeGroup(type))
}

app.post('/', async (c) => {
  const body = await c.req.json<{ name: string; type: string; bank?: string; balance?: number; include_in_total?: number; billing_day?: number | null; payment_day?: number | null; credit_limit?: number | null; payment_method?: string | null; payment_account?: string | null; payment_account_id?: string | null }>()

  if (!body.name || !body.type) {
    return c.json({ ok: false, error: '缺少 name 或 type' }, 400)
  }
  if (!ACCOUNT_TYPES.includes(body.type as typeof ACCOUNT_TYPES[number]) &&
      body.type !== '銀行存款' && body.type !== '投資帳戶') {
    return c.json({ ok: false, error: `type 必須是：${ACCOUNT_TYPES.join('、')}` }, 400)
  }
  if (!isValidDay(body.billing_day) || !isValidDay(body.payment_day)) {
    return c.json({ ok: false, error: '結算日/扣款日請輸入 1-31' }, 400)
  }

  const dup = await findDuplicateInGroup(c.env.DB, body.name, body.type)
  if (dup) {
    return c.json({ ok: false, error: `「${typeGroup(body.type)}」類別中已有帳戶叫「${body.name}」，請使用不同名稱` }, 400)
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
    payment_method: body.payment_method ?? 'manual',
    payment_account: body.payment_account ?? null,
    payment_account_id: body.payment_account_id ?? null,
  })

  return c.json({ ok: true, id }, 201)
})

// 編輯帳戶（名稱、類別、餘額），餘額有變動時自動補一筆調整記錄
app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ name?: string; type?: string; balance?: number; include_in_total?: number; billing_day?: number | null; payment_day?: number | null; credit_limit?: number | null; payment_method?: string | null; payment_account?: string | null; payment_account_id?: string | null }>()

  const before = await getAssetById(c.env.DB, id)
  if (!before) return c.json({ ok: false, error: '找不到此帳戶' }, 404)

  if (!isValidDay(body.billing_day) || !isValidDay(body.payment_day)) {
    return c.json({ ok: false, error: '結算日/扣款日請輸入 1-31' }, 400)
  }

  if (body.name && body.name !== before.name) {
    const dup = await findDuplicateInGroup(c.env.DB, body.name, body.type ?? before.type, id)
    if (dup) {
      return c.json({ ok: false, error: `「${typeGroup(body.type ?? before.type)}」類別中已有帳戶叫「${body.name}」，請使用不同名稱` }, 400)
    }
  }

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
    ...('payment_account_id' in body ? { payment_account_id: body.payment_account_id } : {}),
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
      account_id: before.id,
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
  const creditBalance = assets.filter(a => a.type === '信用卡').reduce((s, a) => s + a.balance, 0)
  const totalInvestments = investments.reduce((s, i) => s + i.market_value, 0)

  await recordAssetSnapshot(c.env.DB, {
    snapshot_date: now.toISOString().slice(0, 10),
    total_assets: totalCash + totalInvestments + creditBalance,
    total_investments: totalInvestments,
    total_cash: totalCash,
    monthly_expense: monthlyExpense,
  })

  return c.json({ ok: true })
})

export default app
