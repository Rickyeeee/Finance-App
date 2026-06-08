# 瑞奇財務系統

個人財務自動化 App，建立在 Cloudflare Workers + D1 上。

## 正式環境網址

| 用途 | URL |
|------|-----|
| 主 App | https://ricky-finance.ke877857.workers.dev |
| 快速新增（iPhone 主畫面） | https://ricky-finance.ke877857.workers.dev/add.html |

---

## 部署步驟

### 1. 安裝依賴

```bash
cd finance-app
npm install
```

### 2. 建立 D1 資料庫

```bash
npm run db:create
```

執行後會看到輸出類似：

```
✅ Successfully created DB 'ricky-finance-db'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**把 `database_id` 複製到 `wrangler.toml` 的對應欄位。**

### 3. 初始化資料庫 Schema

```bash
# 本機測試
npm run db:init

# 正式環境
npm run db:init:remote
```

### 4. 設定環境變數（正式環境）

```bash
wrangler secret put CRON_SECRET
# 輸入一個隨機字串，例如：my-super-secret-2025

wrangler secret put GMAIL_CLIENT_ID
wrangler secret put GMAIL_CLIENT_SECRET
wrangler secret put GMAIL_REFRESH_TOKEN
```

Gmail 的設定方式見下方「Gmail OAuth 設定」章節。

### 5. 本機開發

```bash
npm run dev
# 打開 http://localhost:8787
```

### 6. 部署到 Cloudflare

```bash
npm run deploy
```

---

## Gmail OAuth 設定

### 建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立新專案（或選既有專案）
3. 進入「API 和服務」→「啟用 API」
4. 搜尋 **Gmail API**，點擊啟用

### 建立 OAuth 憑證

1. 進入「API 和服務」→「憑證」
2. 點擊「建立憑證」→「OAuth 用戶端 ID」
3. 應用程式類型選「網頁應用程式」
4. 名稱：`瑞奇財務系統`
5. 已授權的重新導向 URI 填入：
   ```
   https://你的-worker-domain.workers.dev/api/gmail/oauth/callback
   ```
6. 建立後複製 **Client ID** 和 **Client Secret**

### 取得 Refresh Token

1. 先把 Client ID 和 Client Secret 設定到 wrangler.toml（暫時放明文，取到 token 後再改用 secret）
2. 部署後打開：`https://你的網域/api/gmail/oauth/url`
3. 點擊回傳的網址，用 ke877857@gmail.com 登入並授權
4. 授權成功後頁面會顯示 **Refresh Token**
5. 執行以下指令把 token 存入 Cloudflare：
   ```bash
   wrangler secret put GMAIL_REFRESH_TOKEN
   ```
6. 把 wrangler.toml 裡的明文憑證清掉，改用 secret

---

## iPhone 捷徑設定

### 捷徑一：快速新增支出

在 iPhone 「捷徑」App 建立新捷徑，依序加入以下步驟：

**步驟 1：詢問金額**
- 動作：「詢問輸入」
- 提示：`金額（NT$）`
- 輸入類型：數字

**步驟 2：詢問消費名稱**
- 動作：「詢問輸入」
- 提示：`消費名稱`
- 輸入類型：文字

**步驟 3：選擇分類**
- 動作：「從選單選擇」
- 提示：`選擇分類`
- 選項：餐飲、交通、購物、娛樂、醫療、其他

**步驟 4：選擇付款方式**
- 動作：「從選單選擇」
- 提示：`付款方式`
- 選項：永豐、現金、轉帳

**步驟 5：取得今天日期**
- 動作：「格式化日期」
- 日期：當前日期
- 格式：`yyyy-MM-dd`（自訂格式）

**步驟 6：傳送請求**
- 動作：「從 URL 取得內容」
- URL：`https://你的網域/api/transactions`
- 方法：POST
- 標頭：`Content-Type: application/json`
- 請求本文（JSON）：
```json
{
  "name": "[步驟2的結果]",
  "amount": [步驟1的結果],
  "date": "[步驟5的結果]",
  "category": "[步驟3的結果]",
  "card": "[步驟4的結果]"
}
```

**步驟 7：顯示結果**
- 動作：「顯示通知」
- 訊息：`✅ 已記錄 NT$[步驟1的結果]（[步驟3的結果]）`

**建議設定：**
- 捷徑名稱：`記帳`
- 加入主畫面（長按捷徑 → 加入主畫面）
- 或加入小工具快速啟動

---

### 捷徑二：修正記錄

**步驟 1：輸入搜尋關鍵字**
- 動作：「詢問輸入」
- 提示：`搜尋關鍵字（消費名稱的一部分）`

**步驟 2：查詢記錄**
- 動作：「從 URL 取得內容」
- URL：`https://你的網域/api/transactions?limit=5&month=本月`（需要手動填入月份或寫腳本）

**步驟 3：顯示選單**
（由於捷徑 App 的限制，建議直接在瀏覽器打開網頁介面修改）

> **提示**：修正資料用網頁介面點擊「編輯」比較直覺，捷徑主要用於新增現金支出。

---

## Cron 自動同步

系統設定在每天 **22:00 台北時間**（UTC 14:00）自動執行：

1. 掃描 Gmail 的永豐刷卡通知
2. 寫入消費記錄
3. 產出每日摘要

Cron 觸發設定在 `wrangler.toml`：
```toml
[triggers]
crons = ["0 14 * * *"]
```

---

## 檔案結構

```
finance-app/
├── src/
│   ├── index.ts              # 入口、Cron 排程
│   ├── types.ts              # TypeScript 型別
│   ├── routes/
│   │   ├── transactions.ts   # 消費記錄 API
│   │   ├── reconcile.ts      # 對帳 API
│   │   ├── investments.ts    # 投資損益 API
│   │   ├── summary.ts        # 摘要 API
│   │   ├── gmail.ts          # Gmail 同步
│   │   └── assets.ts         # 資產總覽 API
│   ├── services/
│   │   ├── gmail.ts          # Gmail 讀取邏輯
│   │   └── csv-parser.ts     # CSV/帳單解析
│   └── db/
│       └── queries.ts        # 資料庫操作
├── public/
│   ├── index.html            # 資產總覽
│   ├── transactions.html     # 消費記錄
│   ├── reconcile.html        # 信用卡對帳
│   ├── investments.html      # 投資損益
│   ├── css/style.css
│   └── js/api.js
├── schema.sql                # 資料庫結構
├── wrangler.toml
└── package.json
```

---

## API 文件

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/transactions` | 取得消費記錄（?month=2025-06&category=餐飲&status=待確認&limit=50&offset=0） |
| POST | `/api/transactions` | 新增消費記錄 |
| PATCH | `/api/transactions/:id` | 修改消費記錄 |
| DELETE | `/api/transactions/:id` | 刪除消費記錄 |
| GET | `/api/assets` | 取得資產總覽 |
| PATCH | `/api/assets/:id` | 更新帳戶餘額 |
| GET | `/api/assets/history` | 取得資產歷史趨勢 |
| POST | `/api/assets/snapshot` | 儲存當前資產快照 |
| GET | `/api/investments` | 取得投資損益 |
| POST | `/api/investments/upload` | 上傳 Holdary CSV |
| PATCH | `/api/investments/:id` | 手動更新持股 |
| GET | `/api/summary/daily` | 取得每日摘要（?date=2025-06-04） |
| GET | `/api/summary/monthly` | 取得每月報表（?month=2025-06） |
| GET | `/api/reconcile` | 取得對帳記錄（?month=2025-06） |
| POST | `/api/reconcile/upload` | 上傳帳單文字進行對帳 |
| POST | `/api/gmail/sync` | 手動觸發 Gmail 同步 |
| GET | `/api/gmail/oauth/url` | 取得 Gmail OAuth 授權網址 |
