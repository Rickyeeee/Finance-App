# 個人財務系統

個人財務管理 App，建立在 Cloudflare Workers + D1（SQLite）上。

**特色**
- 免費使用（Cloudflare 免費方案足夠個人用量）
- 資料存在自己的 Cloudflare 帳號，完全隔離
- 系統更新由維護者統一推送，用戶不需自己維護程式碼
- 支援 PWA，可加到手機主畫面使用

---

## 快速安裝

不需要懂程式，打開安裝頁面就能建立自己的財務系統：

**→ [開啟安裝頁面](https://ricky-finance.ke877857.workers.dev/install.html)**

只需要：
1. 一個 [Cloudflare 帳號](https://dash.cloudflare.com/sign-up)（免費）
2. 建立一個 Cloudflare API Token（安裝頁面有步驟說明）
3. 填入 App 名稱和登入 PIN

安裝約 30 秒完成，結束後會拿到專屬網址。

---

## 功能總覽

### 總攬
- 各帳戶餘額與資產分組（銀行、信用卡、證券戶、現金）
- 本月支出 / 收入 / 結餘
- 投資總市值與損益摘要
- 資產歷史快照（每日自動記錄）

### 消費紀錄
- 月曆、日列表、月統計三種檢視模式
- 支出 / 收入 / 轉帳（轉帳同時建立兩筆關聯記錄，支援刪除）
- 自訂分類（名稱、排序、icon）
- 定期項目（每月 / 每週 / 每年自動產生）
- 手機版：點擊紀錄開啟編輯，刪除在 modal 內

### 投資
- 持股總覽：市值、成本、損益、報酬率
- 每日漲跌、已實現損益
- 台股即時股價（Yahoo Finance）
- 買入 / 賣出交易紀錄，自動計算均價與持倉
- 賣出連動建立轉帳紀錄，刪除任一筆自動連動
- 市值歷史折線圖（週 / 月 / 年）

### 對帳
- 上傳信用卡帳單文字，自動比對消費記錄
- 狀態：吻合 / 金額不符 / 無記錄

### 快速新增（手機）
- `add.html` 獨立 PWA，可加到手機主畫面，全螢幕無瀏覽器 UI
- 內建 PIN 登入，自動從 API 載入個人分類與帳戶
- 步驟式介面：金額 → 類型/分類 → 名稱/日期 → 帳戶
- 支援支出、收入、轉帳

### iOS 捷徑
- `shortcut-install.html`：登入後顯示 API Token，可複製後手動建捷徑
- `/api/shortcut/download`：動態產生嵌入 token 的 `.shortcut` 檔

---

## 安裝架構說明

每位用戶安裝後擁有：
- 自己 Cloudflare 帳號下的獨立 Worker
- 自己的 D1 資料庫（資料完全隔離）
- 自訂的 App 名稱和登入 PIN

靜態頁面（HTML/CSS/JS）由維護者統一託管，系統更新時所有人自動生效，不需要用戶重新安裝。

```
用戶 A 的 Worker（a-finance.workers.dev）
  └─ API /api/* → 自己的 D1 資料庫
  └─ 靜態 /* → proxy 到維護者的 Worker（自動更新）

用戶 B 的 Worker（b-finance.workers.dev）
  └─ API /api/* → 自己的 D1 資料庫
  └─ 靜態 /* → proxy 到維護者的 Worker（自動更新）
```

---

## 技術架構

- **後端**：Cloudflare Workers（TypeScript）、Hono framework
- **資料庫**：Cloudflare D1（SQLite）
- **前端**：Vanilla JS（ES modules）、HTML + CSS
- **股價來源**：Yahoo Finance API（台股 .TW / .TWO）

---

## 維護者：部署與開發

### 初次設定

```bash
npm install
npm run db:create        # 建立 D1 資料庫，把 database_id 填入 wrangler.toml
npm run db:init:remote   # 初始化 schema
```

設定 Secrets：
```bash
wrangler secret put AUTH_PIN      # 登入 PIN
wrangler secret put AUTH_TOKEN    # Session token
wrangler secret put CRON_SECRET   # Cron 保護
```

### 日常部署

```bash
npm run deploy
# 自動執行：build installer bundle → build shortcut → inject version → deploy
```

每次 deploy 會自動重新 build `public/installer-worker.js`，確保新用戶安裝的是最新版本。

### 本機開發

```bash
npm run dev   # → http://localhost:8787
```

### 災難還原

本地檔案損壞或遺失時（例如同步軟體衝突），從 GitHub 還原：

```bash
git clone https://github.com/Rickyeeee/finance-app.git
cd finance-app
npm install
npm run deploy   # 資料都在 Cloudflare D1，程式碼重新部署即可
```

注意：`.env`、`.dev.vars`（PIN / Token / API 金鑰）不在 git 裡，需另外備份。
資料庫（D1）在 Cloudflare 雲端，不受本地檔案影響。

**開發規則：專案只放在 `D:\Projects\finance-app`，絕不放在 iCloud 或其他同步資料夾內**（同步軟體會損壞 node_modules 和 git 物件）。

---

## 檔案結構

```
finance-app/
├── src/
│   ├── index.ts                  # Hono app 入口（維護者版本）
│   ├── installer-entry.ts        # 用戶 Worker 模板（proxy 靜態檔案）
│   ├── shortcut-generator.ts     # iOS 捷徑產生器（嵌入 token）
│   ├── bplist.ts                 # Binary plist encoder（純 TS，無外部依賴）
│   ├── types.ts
│   └── routes/
│       ├── auth.ts               # PIN 登入
│       ├── transactions.ts       # 收支 + 轉帳 CRUD
│       ├── investments.ts        # 投資組合、交易、股價
│       ├── assets.ts             # 帳戶餘額、資產快照
│       ├── recurring.ts          # 定期項目
│       ├── reconcile.ts          # 信用卡對帳
│       ├── categories.ts         # 分類管理
│       ├── summary.ts            # 每日 / 每月統計
│       ├── installer.ts          # 安裝 API（呼叫 Cloudflare API）
│       └── gmail.ts              # Gmail OAuth（備用）
├── public/
│   ├── index.html                # 總攬
│   ├── transactions.html         # 消費紀錄（含定期項目分頁）
│   ├── investments.html          # 投資
│   ├── reconcile.html            # 帳戶對帳
│   ├── report.html               # 報表
│   ├── add.html                  # 快速新增（手機主畫面 PWA）
│   ├── install.html              # 安裝頁面（給朋友）
│   ├── shortcut-install.html     # iOS 捷徑安裝 + Token 複製
│   ├── installer-worker.js       # 編譯好的 Worker bundle（自動生成）
│   ├── add-manifest.json         # add.html 的 PWA manifest
│   ├── manifest.json             # 主 App PWA manifest
│   ├── sw.js                     # Service worker（離線快取）
│   ├── css/style.css
│   └── js/
│       ├── api.js                # API 呼叫 + 共用 helpers
│       ├── txn-modal.js          # 共用新增/編輯交易 modal（wizard）
│       └── calc-keyboard.js      # 計算機鍵盤
├── scripts/
│   ├── build-installer.js        # build installer bundle
│   ├── generate-shortcut.js      # 產生靜態 .shortcut 檔
│   └── inject-version.js         # 注入版本號
├── schema.sql
├── wrangler.toml                 # 維護者部署設定
├── wrangler.installer.toml       # build installer bundle 用
└── package.json
```

---

## API

### Auth
| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/auth/login` | PIN 登入 |

### 消費紀錄
| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/transactions` | 取得記錄（?month, date, category, type, card, status） |
| POST | `/api/transactions` | 新增 |
| PATCH | `/api/transactions/:id` | 修改 |
| DELETE | `/api/transactions/:id` | 刪除（轉帳連動；投資賣出連動回復持倉） |
| POST | `/api/transactions/transfer` | 新增轉帳 |
| PATCH | `/api/transactions/transfer/:id` | 修改轉帳 |

### 帳戶 / 資產
| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/assets` | 帳戶列表與資產總覽 |
| POST | `/api/assets` | 新增帳戶 |
| PATCH | `/api/assets/:id` | 更新 |
| DELETE | `/api/assets/:id` | 刪除 |
| GET | `/api/assets/history` | 歷史快照（?months=12） |
| POST | `/api/assets/snapshot` | 手動存快照 |

### 投資
| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/investments` | 持股列表與摘要 |
| POST | `/api/investments/refresh-all` | 批量更新市價 |
| GET | `/api/investments/lookup/:symbol` | 查詢股票名稱 |
| GET | `/api/investments/history` | 市值歷史（?range=week/month/year） |
| GET | `/api/investments/trades` | 交易紀錄 |
| POST | `/api/investments/trades` | 新增交易 |
| PATCH | `/api/investments/trades/:id` | 修改交易 |
| DELETE | `/api/investments/trades/:id` | 刪除交易（連動） |

### 定期項目
| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/recurring` | 列表 |
| POST | `/api/recurring` | 新增 |
| PATCH | `/api/recurring/:id` | 修改 |
| DELETE | `/api/recurring/:id` | 刪除 |
| POST | `/api/recurring/process` | 執行本期到期項目 |

### 對帳
| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/reconcile` | 對帳記錄（?month=） |
| POST | `/api/reconcile/upload` | 上傳帳單文字 |

### 分類
| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/categories` | 列表 |
| POST | `/api/categories` | 新增 |
| PATCH | `/api/categories/:id` | 修改 |
| DELETE | `/api/categories/:id` | 刪除 |

### 捷徑 / 快速新增
| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/shortcut/data` | 取得分類與帳戶清單（供捷徑 / add.html 使用） |
| GET | `/api/shortcut/download?t=TOKEN` | 動態產生嵌入 token 的 iOS 捷徑檔 |

### 安裝
| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/installer/run` | 安裝新用戶實例（SSE 串流進度） |
