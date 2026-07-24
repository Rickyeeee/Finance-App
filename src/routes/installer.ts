import { Hono } from 'hono'
import type { Bindings } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

const CF_API = 'https://api.cloudflare.com/client/v4'

// schema SQL（只建表，不插入個人資料）
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, amount INTEGER NOT NULL,
    date DATE NOT NULL, category TEXT NOT NULL DEFAULT '其他',
    card TEXT NOT NULL DEFAULT '', type TEXT NOT NULL DEFAULT '支出',
    status TEXT NOT NULL DEFAULT '待確認', source TEXT NOT NULL DEFAULT '手動輸入',
    account_id TEXT DEFAULT NULL, note TEXT, transfer_id TEXT, deferred_to TEXT DEFAULT NULL,
    recurring_id TEXT DEFAULT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS reconciliation (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, bill_amount INTEGER NOT NULL,
    record_amount INTEGER, date DATE NOT NULL, category TEXT DEFAULT '其他',
    status TEXT NOT NULL DEFAULT '待比對', bill_month TEXT NOT NULL,
    transaction_id TEXT, note TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS investments (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, symbol TEXT NOT NULL,
    shares REAL NOT NULL DEFAULT 0, avg_cost REAL NOT NULL DEFAULT 0,
    market_value INTEGER NOT NULL DEFAULT 0, profit_loss INTEGER NOT NULL DEFAULT 0,
    return_rate REAL NOT NULL DEFAULT 0, current_price REAL DEFAULT 0,
    previous_close REAL DEFAULT 0, realized_pnl REAL DEFAULT 0,
    updated_at DATE, account TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS investment_trades (
    id TEXT PRIMARY KEY, symbol TEXT NOT NULL, name TEXT NOT NULL,
    type TEXT NOT NULL, shares REAL NOT NULL, price REAL NOT NULL,
    amount REAL NOT NULL, date TEXT NOT NULL, account TEXT DEFAULT '',
    to_account TEXT, realized_pnl INTEGER DEFAULT 0, transfer_id TEXT,
    note TEXT, created_at DATETIME DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS daily_summaries (
    id TEXT PRIMARY KEY, date DATE NOT NULL UNIQUE,
    total_amount INTEGER NOT NULL DEFAULT 0, transaction_count INTEGER NOT NULL DEFAULT 0,
    summary_text TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, bank TEXT NOT NULL,
    balance INTEGER NOT NULL DEFAULT 0, include_in_total INTEGER NOT NULL DEFAULT 1,
    billing_day INTEGER DEFAULT NULL, payment_day INTEGER DEFAULT NULL,
    credit_limit INTEGER DEFAULT 0, payment_method TEXT DEFAULT 'manual',
    payment_account TEXT, payment_account_id TEXT, updated_at DATE DEFAULT CURRENT_DATE
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, type TEXT NOT NULL DEFAULT '支出',
    sort_order INTEGER NOT NULL DEFAULT 0, icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS recurring_transactions (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, amount INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT '支出', category TEXT NOT NULL, card TEXT DEFAULT '',
    note TEXT, frequency TEXT NOT NULL DEFAULT 'monthly', day_of_month INTEGER DEFAULT 1,
    start_date DATE, end_date DATE, next_date TEXT NOT NULL,
    fee INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1,
    last_generated TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS asset_history (
    id TEXT PRIMARY KEY, snapshot_date DATE NOT NULL, total_assets INTEGER NOT NULL,
    total_investments INTEGER NOT NULL, total_cash INTEGER NOT NULL,
    monthly_expense INTEGER NOT NULL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reconciliation_bill_month ON reconciliation(bill_month)`,
  `CREATE INDEX IF NOT EXISTS idx_asset_history_date ON asset_history(snapshot_date)`,
  // 預設類別
  `INSERT OR IGNORE INTO categories (id, name, type, sort_order, icon) VALUES
    ('cat-001', '餐飲',   '支出', 10,  '🍽'),
    ('cat-002', '交通',   '支出', 20,  '🚇'),
    ('cat-003', '購物',   '支出', 30,  '🛍️'),
    ('cat-004', '娛樂',   '支出', 40,  '🎮'),
    ('cat-005', '醫療',   '支出', 50,  '🏥'),
    ('cat-006', '家居',   '支出', 60,  '🏠'),
    ('cat-007', '訂閱',   '支出', 70,  '📱'),
    ('cat-008', '學習',   '支出', 80,  '📖'),
    ('cat-009', '其他',   '支出', 90,  '📎'),
    ('cat-010', '薪資',   '收入', 10,  '💰'),
    ('cat-011', '投資收益','收入', 20,  '📈')`,
]

// 補欄位用：CREATE TABLE IF NOT EXISTS 對「已經存在」的舊表不會生效，較早安裝的資料庫
// 不會自動長出後來才加的欄位，導致新版程式碼一存取就整個掛掉（500 + 前端 JSON.parse 失敗）。
// 這裡用 ALTER TABLE ADD COLUMN 補齊，欄位已存在時會回傳失敗，執行時要忽略單筆失敗、不能中斷。
const MIGRATION_STATEMENTS = [
  `ALTER TABLE transactions ADD COLUMN account_id TEXT DEFAULT NULL`,
  `ALTER TABLE transactions ADD COLUMN recurring_id TEXT DEFAULT NULL`,
  `ALTER TABLE assets ADD COLUMN billing_day INTEGER DEFAULT NULL`,
  `ALTER TABLE assets ADD COLUMN payment_day INTEGER DEFAULT NULL`,
  `ALTER TABLE assets ADD COLUMN credit_limit INTEGER DEFAULT 0`,
  `ALTER TABLE assets ADD COLUMN payment_method TEXT DEFAULT 'manual'`,
  `ALTER TABLE assets ADD COLUMN payment_account TEXT`,
  `ALTER TABLE assets ADD COLUMN payment_account_id TEXT`,
  `ALTER TABLE investment_trades ADD COLUMN to_account TEXT`,
  `ALTER TABLE investment_trades ADD COLUMN transfer_id TEXT`,
  `ALTER TABLE investment_trades ADD COLUMN note TEXT`,
  `ALTER TABLE recurring_transactions ADD COLUMN end_date DATE`,
  `ALTER TABLE recurring_transactions ADD COLUMN fee INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE recurring_transactions ADD COLUMN last_generated TEXT`,
]

// ── Cloudflare API helpers ──
async function cfGet(path: string, token: string) {
  const res = await fetch(`${CF_API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  return res.json() as Promise<{ success: boolean; result?: unknown; errors?: unknown[] }>
}

async function cfPost(path: string, token: string, body: unknown) {
  const res = await fetch(`${CF_API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ success: boolean; result?: unknown; errors?: unknown[] }>
}

async function cfPut(path: string, token: string, body: unknown) {
  const res = await fetch(`${CF_API}${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<{ success: boolean; result?: unknown; errors?: unknown[] }>
}

// ── 安裝主流程（SSE 串流進度）──
app.post('/run', async (c) => {
  const body = await c.req.json<{
    api_token: string
    app_name: string
    worker_name: string
    pin: string
    bundle?: string
  }>()

  if (!body.api_token || !body.app_name || !body.worker_name || !body.pin) {
    return c.json({ ok: false, error: '缺少必填欄位' }, 400)
  }

  // 驗證 worker_name 格式
  if (!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(body.worker_name)) {
    return c.json({ ok: false, error: 'Worker 名稱格式錯誤（只能小寫英數字和連字號）' }, 400)
  }

  // SSE stream
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const enc = new TextEncoder()

  const send = (event: string, data: unknown) => {
    writer.write(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  const workerUrl = `https://${body.worker_name}.workers.dev`

  // 在背景執行安裝
  const runInstall = async () => {
    try {
      // ── Step 1: 驗證 token 並取得 account_id ──
      send('step', { step: 1, message: '驗證 Cloudflare 帳號…' })

      const accountsRes = await cfGet('/accounts?per_page=1', body.api_token)
      if (!accountsRes.success || !Array.isArray(accountsRes.result) || accountsRes.result.length === 0) {
        send('error', { message: 'API Token 無效或沒有帳號權限，請確認 Token 是否正確' })
        return
      }
      const account = accountsRes.result[0] as { id: string; name: string }
      const accountId = account.id
      send('done', { step: 1, message: `帳號確認：${account.name}` })

      // ── Step 2: 建立 D1 資料庫 ──
      send('step', { step: 2, message: '建立資料庫…' })

      const dbName = `${body.worker_name}-db`
      let dbId: string

      const createDbRes = await cfPost(`/accounts/${accountId}/d1/database`, body.api_token, { name: dbName })

      if (createDbRes.success && createDbRes.result) {
        dbId = (createDbRes.result as { uuid: string }).uuid
        send('done', { step: 2, message: `資料庫建立完成（${dbName}）` })
      } else {
        // 可能已存在，嘗試查詢
        const listRes = await cfGet(`/accounts/${accountId}/d1/database`, body.api_token)
        if (listRes.success && Array.isArray(listRes.result)) {
          const existing = (listRes.result as Array<{ uuid: string; name: string }>).find(db => db.name === dbName)
          if (existing) {
            dbId = existing.uuid
            send('done', { step: 2, message: `使用已存在的資料庫（${dbName}）` })
          } else {
            send('error', { message: `資料庫建立失敗：${JSON.stringify(createDbRes.errors)}` })
            return
          }
        } else {
          send('error', { message: `資料庫建立失敗` })
          return
        }
      }

      // ── Step 3: 初始化 schema ──
      send('step', { step: 3, message: '初始化資料庫結構…' })

      for (const sql of SCHEMA_STATEMENTS) {
        const r = await cfPost(`/accounts/${accountId}/d1/database/${dbId}/query`, body.api_token, { sql })
        if (!r.success) {
          send('error', { message: `Schema 初始化失敗：${sql.slice(0, 50)}…` })
          return
        }
      }
      send('done', { step: 3, message: '資料庫結構初始化完成' })

      // ── Step 4: 取得 Worker bundle ──
      send('step', { step: 4, message: '準備 Worker 程式碼…' })

      let workerScript: string
      try {
        const bundleRes = await (c.env.ASSETS as Fetcher).fetch(
          new Request('https://assets.local/installer-worker.js')
        )
        if (!bundleRes.ok) throw new Error(`ASSETS HTTP ${bundleRes.status}`)
        workerScript = await bundleRes.text()
      } catch (e) {
        send('error', { message: `無法取得 Worker bundle：${String(e)}` })
        return
      }
      send('done', { step: 4, message: 'Worker 程式碼準備完成' })

      // ── Step 5: 部署 Worker ──
      send('step', { step: 5, message: '部署 Worker…' })

      const metadata = {
        main_module: 'worker.js',
        compatibility_date: '2024-09-23',
        compatibility_flags: ['nodejs_compat'],
        bindings: [
          { type: 'd1', name: 'DB', id: dbId },
          { type: 'plain_text', name: 'APP_NAME', text: body.app_name },
          { type: 'plain_text', name: 'STATIC_ORIGIN', text: 'https://ricky-finance.ke877857.workers.dev' },
        ],
      }

      // 用 FormData 讓 runtime 自動處理 multipart boundary，避免手動拼接的 \r\n 問題
      const formData = new FormData()
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json')
      formData.append('worker.js', new Blob([workerScript], { type: 'application/javascript+module' }), 'worker.js')

      const deployRes = await fetch(`${CF_API}/accounts/${accountId}/workers/scripts/${body.worker_name}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${body.api_token}`,
          // 不要手動設定 Content-Type，讓 FormData 自動加上正確的 boundary
        },
        body: formData,
      })
      const deployData = await deployRes.json() as { success: boolean; errors?: unknown[] }

      if (!deployData.success) {
        send('error', { message: `Worker 部署失敗：${JSON.stringify(deployData.errors)}` })
        return
      }
      send('done', { step: 5, message: 'Worker 部署成功' })

      // ── Step 6: 設定 Secrets ──
      send('step', { step: 6, message: '設定密碼與 Secrets…' })

      const authToken = crypto.randomUUID()
      const cronSecret = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('')

      const secrets = [
        { name: 'AUTH_PIN',      text: body.pin },
        { name: 'AUTH_TOKEN',    text: authToken },
        { name: 'CRON_SECRET',   text: cronSecret },
        { name: 'CF_API_TOKEN',  text: body.api_token },
        { name: 'WORKER_NAME',   text: body.worker_name },
      ]

      for (const s of secrets) {
        const r = await cfPut(
          `/accounts/${accountId}/workers/scripts/${body.worker_name}/secrets`,
          body.api_token,
          { name: s.name, text: s.text, type: 'secret_text' }
        )
        if (!r.success) {
          send('error', { message: `Secret ${s.name} 設定失敗` })
          return
        }
      }
      send('done', { step: 6, message: 'Secrets 設定完成' })

      // ── Step 7: 啟用 workers.dev 子網域 ──
      send('step', { step: 7, message: '啟用網址…' })

      // 取得帳號的 workers.dev 子網域前綴
      let accountSubdomainRes = await cfGet(`/accounts/${accountId}/workers/subdomain`, body.api_token)
      let accountSubdomain = (accountSubdomainRes.result as { subdomain?: string } | null)?.subdomain ?? ''

      // 若帳號尚未建立 workers.dev 子網域，自動建立
      if (!accountSubdomain) {
        const slugBase = body.worker_name.replace(/[^a-z0-9]/g, '').slice(0, 24)
        const newSubdomain = slugBase + Math.floor(Math.random() * 9000 + 1000)
        const createSubRes = await cfPut(`/accounts/${accountId}/workers/subdomain`, body.api_token, { subdomain: newSubdomain })
        if (createSubRes.success) {
          accountSubdomain = newSubdomain
        }
      }

      // 啟用此 Worker 的 workers.dev 子網域
      await cfPost(
        `/accounts/${accountId}/workers/scripts/${body.worker_name}/subdomain`,
        body.api_token,
        { enabled: true }
      )
      send('done', { step: 7, message: '網址啟用完成' })

      // ── 完成 ──
      const finalUrl = accountSubdomain
        ? `https://${body.worker_name}.${accountSubdomain}.workers.dev`
        : `https://${body.worker_name}.workers.dev`

      const staticOrigin = 'https://ricky-finance.ke877857.workers.dev'
      send('complete', {
        url: finalUrl,                  // 朋友的入口網址（書籤用）
        open_url: `${staticOrigin}/?_api=${encodeURIComponent(finalUrl)}`,  // 直接開啟（跳過 redirect）
        app_name: body.app_name,
      })

    } catch (e) {
      send('error', { message: `安裝發生錯誤：${String(e)}` })
    } finally {
      writer.close()
    }
  }

  // 背景執行，立即回傳 SSE stream
  runInstall()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
})

// ── 更新已安裝的 Worker ──
app.post('/update', async (c) => {
  const body = await c.req.json<{
    api_token: string
    worker_name: string
    bundle?: string
  }>()

  if (!body.api_token || !body.worker_name) {
    return c.json({ ok: false, error: '缺少必填欄位' }, 400)
  }

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const enc = new TextEncoder()

  const send = (event: string, data: unknown) => {
    writer.write(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  const runUpdate = async () => {
    try {
      send('step', { step: 1, message: '驗證 Cloudflare 帳號…' })
      const accountsRes = await cfGet('/accounts?per_page=1', body.api_token)
      if (!accountsRes.success || !Array.isArray(accountsRes.result) || accountsRes.result.length === 0) {
        send('error', { message: 'API Token 無效或沒有帳號權限' })
        return
      }
      const account = accountsRes.result[0] as { id: string; name: string }
      const accountId = account.id
      send('done', { step: 1, message: `帳號確認：${account.name}` })

      send('step', { step: 2, message: '取得資料庫資訊…' })
      const dbName = `${body.worker_name}-db`
      const listRes = await cfGet(`/accounts/${accountId}/d1/database`, body.api_token)
      if (!listRes.success || !Array.isArray(listRes.result)) {
        send('error', { message: '無法取得資料庫列表' })
        return
      }
      const existing = (listRes.result as Array<{ uuid: string; name: string }>).find(db => db.name === dbName)
      if (!existing) {
        send('error', { message: `找不到資料庫 ${dbName}，請確認 Worker 名稱正確` })
        return
      }
      const dbId = existing.uuid
      send('done', { step: 2, message: `資料庫確認（${dbName}）` })

      send('step', { step: 3, message: '執行資料庫更新…' })
      // 先補齊舊安裝可能缺少的欄位：ALTER TABLE ADD COLUMN 對已有該欄位的資料庫一定會失敗，
      // 這裡刻意忽略單筆失敗、不能中斷（沒有 IF NOT EXISTS 可用，只能靠試了失敗就跳過）
      for (const sql of MIGRATION_STATEMENTS) {
        await cfPost(`/accounts/${accountId}/d1/database/${dbId}/query`, body.api_token, { sql })
      }
      for (const sql of SCHEMA_STATEMENTS) {
        const r = await cfPost(`/accounts/${accountId}/d1/database/${dbId}/query`, body.api_token, { sql })
        if (!r.success) {
          send('error', { message: `Schema 更新失敗：${sql.slice(0, 50)}…` })
          return
        }
      }
      send('done', { step: 3, message: '資料庫結構更新完成' })

      send('step', { step: 4, message: '部署最新 Worker…' })
      const workerScript = body.bundle
      if (!workerScript) {
        send('error', { message: 'Worker bundle 未附帶，請重新整理頁面後再試' })
        return
      }

      // 取得現有 Worker 的 bindings（保留 APP_NAME 等設定）
      const settingsRes = await cfGet(`/accounts/${accountId}/workers/scripts/${body.worker_name}/settings`, body.api_token)
      if (!settingsRes.success) {
        send('error', { message: `找不到 Worker ${body.worker_name}，請確認名稱正確` })
        return
      }
      const existingSettings = settingsRes.result as { bindings?: Array<{ type: string; name: string; text?: string }> }
      const appNameBinding = existingSettings?.bindings?.find(b => b.name === 'APP_NAME')
      const appName = appNameBinding?.text || '我的財務'

      const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
      const metadata = {
        main_module: 'worker.js',
        compatibility_date: '2024-09-23',
        compatibility_flags: ['nodejs_compat'],
        bindings: [
          { type: 'd1', name: 'DB', id: dbId },
          { type: 'plain_text', name: 'APP_NAME', text: appName },
          { type: 'plain_text', name: 'STATIC_ORIGIN', text: 'https://ricky-finance.ke877857.workers.dev' },
        ],
      }

      const multipart = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="metadata"',
        'Content-Type: application/json',
        '',
        JSON.stringify(metadata),
        `--${boundary}`,
        'Content-Disposition: form-data; name="worker.js"; filename="worker.js"',
        'Content-Type: application/javascript+module',
        '',
        workerScript,
        `--${boundary}--`,
      ].join('\r\n')

      const deployRes = await fetch(`${CF_API}/accounts/${accountId}/workers/scripts/${body.worker_name}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${body.api_token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: multipart,
      })
      const deployData = await deployRes.json() as { success: boolean; errors?: unknown[] }
      if (!deployData.success) {
        send('error', { message: `Worker 部署失敗：${JSON.stringify(deployData.errors)}` })
        return
      }
      send('done', { step: 4, message: 'Worker 更新完成' })

      send('complete', { message: '系統已更新到最新版本' })
    } catch (e) {
      send('error', { message: `更新發生錯誤：${String(e)}` })
    } finally {
      writer.close()
    }
  }

  runUpdate()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
})

export default app
