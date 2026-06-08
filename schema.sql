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
  shares INTEGER NOT NULL DEFAULT 0,
  avg_cost INTEGER NOT NULL DEFAULT 0,
  market_value INTEGER NOT NULL DEFAULT 0,
  profit_loss INTEGER NOT NULL DEFAULT 0,
  return_rate REAL NOT NULL DEFAULT 0,
  updated_at DATE,
  account TEXT NOT NULL
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
  updated_at DATE DEFAULT CURRENT_DATE
);

-- 自定義分類
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT '支出',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

-- 初始投資資料
INSERT OR IGNORE INTO investments (id, name, symbol, shares, avg_cost, market_value, profit_loss, return_rate, account)
VALUES
  ('inv-0050', '元大台灣50', '0050', 1266, 96, 0, 0, 0.0, ''),
  ('inv-2330', '台積電', '2330', 47, 750, 0, 0, 0.0, '');

-- 初始帳戶資料
INSERT OR IGNORE INTO assets (id, name, type, bank, balance)
VALUES
  ('acc-ctbc', '中信', '銀行存款', '中國信託', 0),
  ('acc-post', '郵局', '銀行存款', '中華郵政', 0),
  ('acc-ktb', '國泰', '銀行存款', '國泰世華', 0),
  ('acc-sinopac-inv', '', '投資帳戶', '永豐銀行', 0);

-- 索引
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_reconciliation_bill_month ON reconciliation(bill_month);
CREATE INDEX IF NOT EXISTS idx_asset_history_date ON asset_history(snapshot_date);
