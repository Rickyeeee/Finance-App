# 部署說明

個人財務管理系統，基於 Cloudflare Workers + D1 SQLite。每個人部署一份獨立的後端，資料完全隔離。

---

## 需要準備

- [Cloudflare 帳號](https://dash.cloudflare.com/sign-up)（免費方案即可）
- [Node.js](https://nodejs.org/) v18+
- [Git](https://git-scm.com/)

---

## 步驟一：安裝依賴

```bash
npm install
```

---

## 步驟二：登入 Cloudflare

```bash
npx wrangler login
```

瀏覽器會開啟授權頁面，登入你的 Cloudflare 帳號。

---

## 步驟三：建立資料庫

```bash
npx wrangler d1 create my-finance-db
```

執行後會輸出類似：

```
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

複製這個 `database_id`，填入 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-finance-db"
database_id = "貼上你的 database_id"
```

---

## 步驟四：初始化資料庫結構

```bash
npx wrangler d1 execute my-finance-db --remote --file=src/db/schema.sql
```

---

## 步驟五：設定個人化選項

### 修改 `wrangler.toml`

```toml
name = "my-finance"          # Worker 名稱，影響預設網域 (my-finance.xxx.workers.dev)

[vars]
APP_NAME = "我的財務"        # ← 改成你想要的 App 名稱
```

### 設定 PIN 碼（登入密碼）

```bash
npx wrangler secret put AUTH_PIN
# 輸入你想要的 PIN 碼（純數字，例如 123456）

npx wrangler secret put AUTH_TOKEN
# 輸入一個隨機字串作為 API token（例如用密碼產生器產生 32 位英數字串）
```

---

## 步驟六：部署

```bash
npx wrangler deploy
```

部署成功後會顯示你的 Worker 網址，例如：

```
https://my-finance.your-account.workers.dev
```

打開這個網址，輸入你設定的 PIN 碼即可使用。

---

## 可選設定

### 自訂網域

在 Cloudflare Dashboard → Workers & Pages → 你的 Worker → Custom Domains，可以綁定自訂網域。

### Gmail 自動同步

如果要啟用 Gmail 消費記錄自動讀取功能，需要設定 Google OAuth：

```bash
npx wrangler secret put GMAIL_CLIENT_ID
npx wrangler secret put GMAIL_CLIENT_SECRET
npx wrangler secret put GMAIL_REFRESH_TOKEN
```

詳細設定方式請參考 Google Cloud Console 的 OAuth 2.0 設定。

---

## 更新 App 名稱

只需修改 `wrangler.toml` 裡的 `APP_NAME`，重新 `npx wrangler deploy` 即可。
