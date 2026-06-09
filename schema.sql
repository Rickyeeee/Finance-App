-- 消費記錄
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT '其他',
  card TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '支出',
  status TEXT NOT NULL DEFAULT '待確認',
  source TEXT NOT NULL DEFAULT '手動輸入',
  note TEXT,
  transfer_id TEXT,
  deferred_to TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 信用卡對帳記錄
CREATE TABLE IF NOT EXISTS reconciliation (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bill_amount INTEGER NOT NULL,
  record_amount INTEGER,
  date DATE NOT NULL,
  category TEXT DEFAULT '其他',
  status TEXT NOT NULL DEFAULT '待比對',
  bill_month TEXT NOT NULL,
  transaction_id TEXT,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 投資損益
CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  shares REAL NOT NULL DEFAULT 0,
  avg_cost REAL NOT NULL DEFAULT 0,
  market_value INTEGER NOT NULL DEFAULT 0,
  profit_loss INTEGER NOT NULL DEFAULT 0,
  return_rate REAL NOT NULL DEFAULT 0,
  current_price REAL DEFAULT 0,
  previous_close REAL DEFAULT 0,
  realized_pnl REAL DEFAULT 0,
  updated_at DATE,
  account TEXT NOT NULL DEFAULT ''
);

-- 投資交易記錄
CREATE TABLE IF NOT EXISTS investment_trades (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  shares REAL NOT NULL,
  price REAL NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  account TEXT DEFAULT '',
  to_account TEXT,
  realized_pnl INTEGER DEFAULT 0,
  transfer_id TEXT,
  note TEXT,
  created_at DATETIME DEFAULT (datetime('now'))
);

-- 每日摘要
CREATE TABLE IF NOT EXISTS daily_summaries (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_amount INTEGER NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  summary_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 帳戶資產
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  bank TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  include_in_total INTEGER NOT NULL DEFAULT 1,
  billing_day INTEGER DEFAULT NULL,
  payment_day INTEGER DEFAULT NULL,
  credit_limit INTEGER DEFAULT 0,
  payment_method TEXT DEFAULT 'manual',
  payment_account TEXT,
  updated_at DATE DEFAULT CURRENT_DATE
);

-- 自定義分類
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT '支出',
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 定期項目
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT '支出',
  category TEXT NOT NULL,
  card TEXT DEFAULT '',
  note TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  day_of_month INTEGER DEFAULT 1,
  start_date DATE,
  end_date DATE,
  next_date TEXT NOT NULL,
  fee INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_generated TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 資產歷史（用於趨勢圖）
CREATE TABLE IF NOT EXISTS asset_history (
  id TEXT PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  total_assets INTEGER NOT NULL,
  total_investments INTEGER NOT NULL,
  total_cash INTEGER NOT NULL,
  monthly_expense INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_bill_month ON reconciliation(bill_month);
CREATE INDEX IF NOT EXISTS idx_asset_history_date ON asset_history(snapshot_date);
