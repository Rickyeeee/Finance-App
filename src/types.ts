export type Bindings = {
  DB: D1Database
  ASSETS: Fetcher
  GMAIL_CLIENT_ID: string
  GMAIL_CLIENT_SECRET: string
  GMAIL_REFRESH_TOKEN: string
  CRON_SECRET: string
  AUTH_PIN: string
  AUTH_TOKEN: string
  APP_NAME?: string
  STATIC_ORIGIN?: string
  CF_API_TOKEN?: string
  WORKER_NAME?: string
}

export type Transaction = {
  id: string
  name: string
  amount: number
  date: string
  category: string
  card: string
  account_id: string | null
  type: string
  status: string
  source: string
  note: string | null
  transfer_id: string | null
  deferred_to: string | null
  recurring_id: string | null
  created_at: string
}

export type Category = {
  id: string
  name: string
  type: string
  sort_order: number
  icon: string | null
  created_at: string
}

export type ReconciliationItem = {
  id: string
  name: string
  bill_amount: number
  record_amount: number | null
  date: string
  category: string | null
  status: string
  bill_month: string
  transaction_id: string | null
  note: string | null
  created_at: string
}

export type Investment = {
  id: string
  name: string
  symbol: string
  shares: number
  avg_cost: number
  market_value: number
  profit_loss: number
  return_rate: number
  realized_pnl: number
  current_price: number
  previous_close: number
  updated_at: string | null
  account: string
}

export type InvestmentTrade = {
  id: string
  symbol: string
  name: string
  type: string
  shares: number
  price: number
  amount: number
  date: string
  account: string
  to_account: string | null
  realized_pnl: number
  transfer_id: string | null
  note: string | null
  created_at: string
}

export type Asset = {
  id: string
  name: string
  type: string
  bank: string
  balance: number
  include_in_total: number
  billing_day: number | null
  payment_day: number | null
  credit_limit: number | null
  payment_method: string | null
  payment_account: string | null
  payment_account_id: string | null
  updated_at: string | null
}

export type DailySummary = {
  id: string
  date: string
  total_amount: number
  transaction_count: number
  summary_text: string
  created_at: string
}

export type AssetHistory = {
  id: string
  snapshot_date: string
  total_assets: number
  total_investments: number
  total_cash: number
  monthly_expense: number
  created_at: string
}

export type RecurringTransaction = {
  id: string
  name: string
  amount: number
  type: string
  category: string
  card: string
  note: string | null
  frequency: string
  day_of_month: number
  next_date: string
  start_date: string
  end_date: string | null
  fee: number
  is_active: number
  last_generated: string | null
  created_at: string
}

export const STATUSES = ['待確認', '已對帳', '不匹配'] as const
