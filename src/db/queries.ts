import type { D1Database } from '@cloudflare/workers-types'
import type { Transaction, ReconciliationItem, Investment, InvestmentTrade, Asset, DailySummary, AssetHistory, Category, RecurringTransaction } from '../types'

export function generateId(prefix = 'tx') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// --- Transactions ---

export async function getTransactions(
  db: D1Database,
  opts: { limit?: number; offset?: number; date?: string; month?: string; date_from?: string; date_to?: string; category?: string; status?: string; type?: string; card?: string; account_id?: string }
) {
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (opts.date) { conditions.push('date = ?'); params.push(opts.date) }
  if (opts.month) { conditions.push("strftime('%Y-%m', date) = ?"); params.push(opts.month) }
  if (opts.date_from) { conditions.push('date >= ?'); params.push(opts.date_from) }
  if (opts.date_to) { conditions.push('date <= ?'); params.push(opts.date_to) }
  if (opts.category) { conditions.push('category = ?'); params.push(opts.category) }
  if (opts.status) { conditions.push('status = ?'); params.push(opts.status) }
  if (opts.type) { conditions.push('type = ?'); params.push(opts.type) }
  if (opts.account_id) { conditions.push('account_id = ?'); params.push(opts.account_id) }
  else if (opts.card) { conditions.push('card = ?'); params.push(opts.card) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = opts.limit ?? 50
  const offset = opts.offset ?? 0

  const { results } = await db
    .prepare(`SELECT * FROM transactions ${where} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`)
    .bind(...params, limit, offset)
    .all<Transaction>()

  const countRow = await db
    .prepare(`SELECT COUNT(*) as total FROM transactions ${where}`)
    .bind(...params)
    .first<{ total: number }>()

  return { data: results, total: countRow?.total ?? 0 }
}

async function adjustAssetBalance(db: D1Database, accountName: string | null | undefined, delta: number) {
  if (!accountName) return
  await db.prepare("UPDATE assets SET balance = balance + ?, updated_at = date('now') WHERE name = ?")
    .bind(delta, accountName).run()
}

async function calcAssetDelta(db: D1Database, accountName: string, amount: number, type: string): Promise<number> {
  const asset = await db.prepare('SELECT type FROM assets WHERE name = ?').bind(accountName).first<{ type: string }>()
  if (!asset) return 0
  const isIncome = type === '收入'
  // 所有帳戶統一邏輯：收入增加餘額，支出減少餘額
  // 信用卡餘額為負值（負債），消費讓餘額更負，還款讓餘額回升
  return isIncome ? amount : -amount
}

export async function createTransaction(db: D1Database, data: Omit<Transaction, 'id' | 'created_at'>) {
  const id = generateId('tx')
  await db
    .prepare('INSERT INTO transactions (id, name, amount, date, category, card, account_id, type, status, source, note, transfer_id, recurring_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, data.name, data.amount, data.date, data.category, data.card, data.account_id ?? null, data.type ?? '支出', data.status, data.source, data.note ?? null, data.transfer_id ?? null, data.recurring_id ?? null)
    .run()

  if (data.source !== '餘額調整' && data.card) {
    const delta = await calcAssetDelta(db, data.card, data.amount, data.type ?? '支出')
    await adjustAssetBalance(db, data.card, delta)
  }

  return id
}

export async function createTransfer(db: D1Database, data: {
  from_account: string; to_account: string; amount: number; date: string; note?: string | null; fee?: number; outName?: string; inName?: string
}) {
  const transferId = generateId('xfr')
  await createTransaction(db, {
    name: data.outName ?? `轉帳 → ${data.to_account}`,
    amount: data.amount,
    date: data.date,
    category: '轉帳',
    card: data.from_account,
    type: '支出',
    status: '已對帳',
    source: '手動輸入',
    note: data.note ?? null,
    transfer_id: transferId,
  })
  await createTransaction(db, {
    name: data.inName ?? `轉帳 ← ${data.from_account}`,
    amount: data.amount,
    date: data.date,
    category: '轉帳',
    card: data.to_account,
    type: '收入',
    status: '已對帳',
    source: '手動輸入',
    note: data.note ?? null,
    transfer_id: transferId,
  })
  if (data.fee && data.fee > 0) {
    await createTransaction(db, {
      name: `手續費（轉帳至 ${data.to_account}）`,
      amount: data.fee,
      date: data.date,
      category: '手續費',
      card: data.from_account,
      type: '支出',
      status: '已對帳',
      source: '手動輸入',
      note: null,
      transfer_id: transferId,
    })
  }
  return transferId
}

export async function deleteTransferPair(db: D1Database, transferId: string) {
  const { results } = await db.prepare('SELECT card, amount, type FROM transactions WHERE transfer_id = ?')
    .bind(transferId).all<{ card: string; amount: number; type: string }>()
  await db.prepare('DELETE FROM transactions WHERE transfer_id = ?').bind(transferId).run()
  for (const txn of results) {
    if (txn.card) {
      const delta = await calcAssetDelta(db, txn.card, txn.amount, txn.type)
      await adjustAssetBalance(db, txn.card, -delta)  // 反轉
    }
  }
}

export async function updateTransaction(db: D1Database, id: string, data: Partial<Omit<Transaction, 'id' | 'created_at'>>) {
  // 取得原始記錄，以便計算差額
  const old = await db.prepare('SELECT card, amount, type, source FROM transactions WHERE id = ?')
    .bind(id).first<{ card: string; amount: number; type: string; source: string }>()

  const fields = Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined)
  if (!fields.length) return false
  const sets = fields.map(f => `${f} = ?`).join(', ')
  const values = fields.map(f => data[f as keyof typeof data])
  const result = await db.prepare(`UPDATE transactions SET ${sets} WHERE id = ?`).bind(...values, id).run()

  const financialFields = new Set(['card', 'amount', 'type'])
  const hasFinancialChange = fields.some(f => financialFields.has(f))
  if (result.meta.changes > 0 && old && hasFinancialChange) {
    const newCard   = (data.card   !== undefined ? data.card   : old.card)   || ''
    const newAmount = data.amount  !== undefined ? data.amount  : old.amount
    const newType   = data.type    !== undefined ? data.type    : old.type

    // 反轉舊影響
    if (old.card) {
      const oldDelta = await calcAssetDelta(db, old.card, old.amount, old.type)
      await adjustAssetBalance(db, old.card, -oldDelta)
    }
    // 套用新影響
    if (newCard) {
      const newDelta = await calcAssetDelta(db, newCard, newAmount, newType)
      await adjustAssetBalance(db, newCard, newDelta)
    }
  }

  return result.meta.changes > 0
}

export async function deleteTransaction(db: D1Database, id: string) {
  const txn = await db.prepare('SELECT card, amount, type, source FROM transactions WHERE id = ?')
    .bind(id).first<{ card: string; amount: number; type: string; source: string }>()
  const result = await db.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run()
  if (result.meta.changes > 0 && txn && txn.card) {
    const delta = await calcAssetDelta(db, txn.card, txn.amount, txn.type)
    await adjustAssetBalance(db, txn.card, -delta)  // 反轉
  }
  return result.meta.changes > 0
}

export async function findDuplicateTransaction(db: D1Database, name: string, amount: number, date: string) {
  return db
    .prepare("SELECT id FROM transactions WHERE name = ? AND amount = ? AND date = ? AND source = 'Gmail自動'")
    .bind(name, amount, date)
    .first<{ id: string }>()
}

// --- Investments ---

export async function getInvestments(db: D1Database) {
  const { results } = await db.prepare('SELECT * FROM investments ORDER BY name').all<Investment>()
  return results
}

export async function deleteInvestment(db: D1Database, id: string) {
  const result = await db.prepare('DELETE FROM investments WHERE id = ?').bind(id).run()
  return result.meta.changes > 0
}

export async function updateInvestment(db: D1Database, id: string, data: Partial<Investment>) {
  const fields = ['shares', 'avg_cost', 'market_value', 'profit_loss', 'return_rate', 'updated_at']
    .filter(f => data[f as keyof Investment] !== undefined)
  if (!fields.length) return false
  const sets = fields.map(f => `${f} = ?`).join(', ')
  const values = fields.map(f => data[f as keyof Investment])
  const result = await db.prepare(`UPDATE investments SET ${sets} WHERE id = ?`).bind(...values, id).run()
  return result.meta.changes > 0
}

export async function upsertInvestment(db: D1Database, data: Omit<Investment, 'id'> & { id?: string }) {
  const id = data.id ?? generateId('inv')
  await db.prepare(`
    INSERT INTO investments (id, name, symbol, shares, avg_cost, market_value, profit_loss, return_rate, realized_pnl, current_price, previous_close, updated_at, account)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      shares=excluded.shares, avg_cost=excluded.avg_cost, market_value=excluded.market_value,
      profit_loss=excluded.profit_loss, return_rate=excluded.return_rate,
      realized_pnl=excluded.realized_pnl,
      current_price=excluded.current_price, previous_close=excluded.previous_close,
      updated_at=excluded.updated_at
  `).bind(id, data.name, data.symbol, data.shares, data.avg_cost, data.market_value, data.profit_loss, data.return_rate, data.realized_pnl ?? 0, data.current_price ?? 0, data.previous_close ?? 0, data.updated_at, data.account).run()
  return id
}

// --- Investment Trades ---

export async function getInvestmentTrades(db: D1Database, symbol?: string, account?: string) {
  let where = ''
  const params: string[] = []
  if (symbol && account !== undefined) {
    where = 'WHERE symbol = ? AND account = ?'
    params.push(symbol, account)
  } else if (symbol) {
    where = 'WHERE symbol = ?'
    params.push(symbol)
  }
  const { results } = await db
    .prepare(`SELECT * FROM investment_trades ${where} ORDER BY date DESC, created_at DESC`)
    .bind(...params)
    .all<InvestmentTrade>()
  return results
}

export async function createInvestmentTrade(db: D1Database, data: Omit<InvestmentTrade, 'id' | 'created_at'>) {
  const id = generateId('trd')
  await db.prepare(`
    INSERT INTO investment_trades (id, symbol, name, type, shares, price, amount, date, account, to_account, realized_pnl, transfer_id, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, data.symbol, data.name, data.type, data.shares, data.price, data.amount, data.date, data.account ?? '', data.to_account ?? null, data.realized_pnl ?? 0, data.transfer_id ?? null, data.note ?? null).run()
  return id
}

export async function deleteInvestmentTrade(db: D1Database, id: string) {
  const result = await db.prepare('DELETE FROM investment_trades WHERE id = ?').bind(id).run()
  return result.meta.changes > 0
}

// --- Assets ---

export async function getAssets(db: D1Database) {
  const { results } = await db.prepare('SELECT * FROM assets ORDER BY type, name').all<Asset>()
  return results
}

export async function createAsset(db: D1Database, data: { name: string; type: string; bank: string; balance: number; include_in_total?: number; billing_day?: number | null; payment_day?: number | null; credit_limit?: number | null; payment_method?: string | null; payment_account?: string | null }) {
  const id = generateId('acc')
  await db.prepare("INSERT INTO assets (id, name, type, bank, balance, include_in_total, billing_day, payment_day, credit_limit, payment_method, payment_account, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))")
    .bind(id, data.name, data.type, data.bank, data.balance, data.include_in_total ?? 1, data.billing_day ?? null, data.payment_day ?? null, data.credit_limit ?? 0, data.payment_method ?? 'manual', data.payment_account ?? null)
    .run()
  return id
}

export async function updateAsset(db: D1Database, id: string, balance: number) {
  const result = await db
    .prepare("UPDATE assets SET balance = ?, updated_at = date('now') WHERE id = ?")
    .bind(balance, id)
    .run()
  return result.meta.changes > 0
}

export async function updateAssetFull(
  db: D1Database,
  id: string,
  data: { name?: string; type?: string; balance?: number; include_in_total?: number; billing_day?: number | null; payment_day?: number | null; credit_limit?: number | null; payment_method?: string | null; payment_account?: string | null }
) {
  const fields: string[] = []
  const values: (string | number | null)[] = []
  if (data.name !== undefined) { fields.push('name'); values.push(data.name) }
  if (data.type !== undefined) { fields.push('type'); values.push(data.type) }
  if (data.balance !== undefined) { fields.push('balance'); values.push(data.balance) }
  if (data.include_in_total !== undefined) { fields.push('include_in_total'); values.push(data.include_in_total) }
  if ('billing_day' in data) { fields.push('billing_day'); values.push(data.billing_day ?? null) }
  if ('payment_day' in data) { fields.push('payment_day'); values.push(data.payment_day ?? null) }
  if ('credit_limit' in data) { fields.push('credit_limit'); values.push(data.credit_limit ?? null) }
  if ('payment_method' in data) { fields.push('payment_method'); values.push(data.payment_method ?? 'manual') }
  if ('payment_account' in data) { fields.push('payment_account'); values.push(data.payment_account ?? null) }
  if (!fields.length) return null

  const sets = [...fields.map(f => `${f} = ?`), "updated_at = date('now')"].join(', ')
  await db.prepare(`UPDATE assets SET ${sets} WHERE id = ?`).bind(...values, id).run()

  return db.prepare('SELECT * FROM assets WHERE id = ?').bind(id).first<Asset>()
}

export async function getAssetById(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM assets WHERE id = ?').bind(id).first<Asset>()
}

export async function deleteAsset(db: D1Database, id: string) {
  const result = await db.prepare('DELETE FROM assets WHERE id = ?').bind(id).run()
  return result.meta.changes > 0
}

// --- Summary ---

export async function getDailySummary(db: D1Database, date: string) {
  return db.prepare('SELECT * FROM daily_summaries WHERE date = ?').bind(date).first<DailySummary>()
}

export async function upsertDailySummary(db: D1Database, date: string, data: { total_amount: number; transaction_count: number; summary_text: string }) {
  const id = generateId('sum')
  await db.prepare(`
    INSERT INTO daily_summaries (id, date, total_amount, transaction_count, summary_text)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      total_amount=excluded.total_amount, transaction_count=excluded.transaction_count, summary_text=excluded.summary_text
  `).bind(id, date, data.total_amount, data.transaction_count, data.summary_text).run()
}

export async function getMonthlySummary(db: D1Database, month: string) {
  const rows = await db.prepare(`
    SELECT category, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE strftime('%Y-%m', date) = ?
      AND type = '支出'
      AND transfer_id IS NULL
    GROUP BY category
    ORDER BY total DESC
  `).bind(month).all<{ category: string; total: number; count: number }>()

  const totals = await db.prepare(`
    SELECT SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE strftime('%Y-%m', date) = ?
      AND type = '支出'
      AND transfer_id IS NULL
  `).bind(month).first<{ total: number; count: number }>()

  const incomeTotals = await db.prepare(`
    SELECT SUM(amount) as total
    FROM transactions
    WHERE strftime('%Y-%m', date) = ?
      AND type = '收入'
      AND transfer_id IS NULL
  `).bind(month).first<{ total: number }>()

  return {
    byCategory: rows.results,
    total: totals?.total ?? 0,
    count: totals?.count ?? 0,
    income: incomeTotals?.total ?? 0,
  }
}

// --- Reconciliation ---

export async function getReconciliations(db: D1Database, billMonth?: string) {
  const where = billMonth ? 'WHERE bill_month = ?' : ''
  const params = billMonth ? [billMonth] : []
  const { results } = await db
    .prepare(`SELECT * FROM reconciliation ${where} ORDER BY date DESC`)
    .bind(...params)
    .all<ReconciliationItem>()
  return results
}

export async function createReconciliationItem(db: D1Database, data: Omit<ReconciliationItem, 'id' | 'created_at'>) {
  const id = generateId('rec')
  await db.prepare(`
    INSERT INTO reconciliation (id, name, bill_amount, record_amount, date, category, status, bill_month, transaction_id, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, data.name, data.bill_amount, data.record_amount ?? null, data.date, data.category ?? '其他', data.status, data.bill_month, data.transaction_id ?? null, data.note ?? null).run()
  return id
}

export async function updateReconciliationItem(db: D1Database, id: string, data: Partial<ReconciliationItem>) {
  const fields = ['status', 'note', 'transaction_id', 'record_amount'].filter(f => data[f as keyof typeof data] !== undefined)
  if (!fields.length) return false
  const sets = fields.map(f => `${f} = ?`).join(', ')
  const values = fields.map(f => data[f as keyof typeof data])
  const result = await db.prepare(`UPDATE reconciliation SET ${sets} WHERE id = ?`).bind(...values, id).run()
  return result.meta.changes > 0
}

// --- Asset History ---

export async function getAssetHistory(db: D1Database, months = 12) {
  // 每月取最後一筆，顯示近 N 個月的月度趨勢
  const { results } = await db.prepare(`
    SELECT * FROM asset_history
    WHERE snapshot_date IN (
      SELECT MAX(snapshot_date) FROM asset_history
      WHERE snapshot_date >= date('now', '-' || ? || ' months')
      GROUP BY substr(snapshot_date, 1, 7)
    )
    ORDER BY snapshot_date ASC
  `).bind(months).all<AssetHistory>()
  return results
}

export async function recordAssetSnapshot(db: D1Database, data: Omit<AssetHistory, 'id' | 'created_at'>) {
  const id = generateId('snap')
  await db.prepare(`
    INSERT OR REPLACE INTO asset_history (id, snapshot_date, total_assets, total_investments, total_cash, monthly_expense)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, data.snapshot_date, data.total_assets, data.total_investments, data.total_cash, data.monthly_expense).run()
}

// --- Categories ---

export async function getCategories(db: D1Database) {
  const { results } = await db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC').all<Category>()
  return results
}

export async function createCategory(db: D1Database, name: string, type: string = '支出', sort_order?: number, icon?: string) {
  const id = generateId('cat')
  const order = sort_order ?? 0
  await db.prepare('INSERT INTO categories (id, name, type, sort_order, icon) VALUES (?, ?, ?, ?, ?)').bind(id, name, type, order, icon ?? null).run()
  return id
}

export async function updateCategory(db: D1Database, id: string, data: { name?: string; sort_order?: number; icon?: string | null }) {
  // 若有改名，先取舊名以便同步更新既有記錄
  let oldName: string | null = null
  if (data.name !== undefined) {
    const row = await db.prepare('SELECT name FROM categories WHERE id = ?').bind(id).first<{ name: string }>()
    oldName = row?.name ?? null
  }

  const fields: string[] = []
  const values: (string | number | null)[] = []
  if (data.name !== undefined) { fields.push('name'); values.push(data.name) }
  if (data.sort_order !== undefined) { fields.push('sort_order'); values.push(data.sort_order) }
  if ('icon' in data) { fields.push('icon'); values.push(data.icon ?? null) }
  if (!fields.length) return false
  const sets = fields.map(f => `${f} = ?`).join(', ')
  const result = await db.prepare(`UPDATE categories SET ${sets} WHERE id = ?`).bind(...values, id).run()

  // 分類改名後，同步更新所有使用舊名稱的交易和定期項目
  if (result.meta.changes > 0 && data.name !== undefined && oldName && oldName !== data.name) {
    await db.prepare('UPDATE transactions SET category = ? WHERE category = ?').bind(data.name, oldName).run()
    await db.prepare('UPDATE recurring_transactions SET category = ? WHERE category = ?').bind(data.name, oldName).run()
  }

  return result.meta.changes > 0
}

export async function deleteCategory(db: D1Database, id: string) {
  const result = await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run()
  return result.meta.changes > 0
}

// --- Recurring Transactions ---

export async function getRecurring(db: D1Database) {
  const { results } = await db.prepare('SELECT * FROM recurring_transactions ORDER BY next_date ASC, name ASC').all<RecurringTransaction>()
  return results
}

export async function createRecurring(db: D1Database, data: Omit<RecurringTransaction, 'id' | 'created_at' | 'last_generated'>) {
  const id = generateId('rcr')
  const startDate = data.start_date ?? data.next_date
  await db.prepare(`
    INSERT INTO recurring_transactions (id, name, amount, type, category, card, note, frequency, day_of_month, next_date, start_date, end_date, fee, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, data.name, data.amount, data.type ?? '支出', data.category, data.card ?? '', data.note ?? null, data.frequency ?? 'monthly', data.day_of_month ?? 1, data.next_date, startDate, data.end_date ?? null, data.fee ?? 0, data.is_active ?? 1).run()
  return id
}

export async function updateRecurring(db: D1Database, id: string, data: Partial<RecurringTransaction>) {
  const allowed = ['name', 'amount', 'type', 'category', 'card', 'note', 'frequency', 'day_of_month', 'next_date', 'start_date', 'end_date', 'fee', 'is_active', 'last_generated']
  const fields = allowed.filter(f => (data as Record<string, unknown>)[f] !== undefined)
  if (!fields.length) return false
  const sets = fields.map(f => `${f} = ?`).join(', ')
  const values = fields.map(f => (data as Record<string, unknown>)[f])
  await db.prepare(`UPDATE recurring_transactions SET ${sets} WHERE id = ?`).bind(...values, id).run()
  return true
}

export async function deleteRecurring(db: D1Database, id: string) {
  const result = await db.prepare('DELETE FROM recurring_transactions WHERE id = ?').bind(id).run()
  return result.meta.changes > 0
}

export async function processRecurring(db: D1Database): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const { results } = await db
    .prepare('SELECT * FROM recurring_transactions WHERE is_active = 1 AND next_date <= ? AND (end_date IS NULL OR end_date >= ?)')
    .bind(today, today)
    .all<RecurringTransaction>()

  let count = 0
  for (const item of results) {
    const fee = item.fee ?? 0
    await createTransaction(db, {
      name: item.name,
      amount: item.amount + fee,
      date: item.next_date,
      category: item.category,
      card: item.card ?? '',
      type: item.type,
      status: '待確認',
      source: '定期',
      note: fee > 0 ? `含手續費 NT${fee.toLocaleString()}` : item.note,
      transfer_id: null,
      recurring_id: item.id,
    })
    const next = calcNextDate(item.next_date, item.frequency, item.day_of_month)
    await updateRecurring(db, item.id, { next_date: next, last_generated: today })
    count++
  }
  return count
}

function calcNextDate(dateStr: string, frequency: string, dayOfMonth = 1): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (frequency === 'weekly') {
    const dt = new Date(y, m - 1, d + 7)
    return dt.toISOString().slice(0, 10)
  }
  if (frequency === 'yearly') {
    const maxD = new Date(y + 1, m, 0).getDate()
    return `${y + 1}-${String(m).padStart(2, '0')}-${String(Math.min(d, maxD)).padStart(2, '0')}`
  }
  // monthly (default)
  let ny = y, nm = m + 1
  if (nm > 12) { nm = 1; ny++ }
  const maxD = new Date(ny, nm, 0).getDate()
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(dayOfMonth, maxD)).padStart(2, '0')}`
}
