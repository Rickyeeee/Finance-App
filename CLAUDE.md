# Finance App — 專案說明

## 技術架構

- **後端**：Cloudflare Workers + D1（SQLite）、Hono framework（TypeScript）
- **前端**：Vanilla JS（ES modules）、HTML + CSS
- **部署**：`& "C:\Program Files\nodejs\node.exe" node_modules\wrangler\bin\wrangler.js deploy`

---

## 部署流程

```bash
# 一般部署（自動先 build installer bundle）
npm run deploy

# 只 build installer bundle（不 deploy）
npm run build:installer
```

`predeploy` 會自動執行 `build:installer`，確保 `public/installer-worker.js` 是最新版本。

---

## 安裝程式架構

朋友可以透過網頁一鍵安裝自己的獨立實例：

- **安裝頁面**：`https://ricky-finance.ke877857.workers.dev/install.html`
- **安裝 API**：`POST /api/installer/run`（SSE 串流回傳進度）
- **Worker bundle**：`public/installer-worker.js`（每次 deploy 自動重新 build）
- **Worker 模板**：`src/installer-entry.ts`（靜態檔案 proxy 回 Ricky 的 Worker）

朋友安裝後的架構：
- API 跑在他自己的 Cloudflare Workers（獨立 D1 資料庫，資料完全隔離）
- 靜態頁面（HTML/CSS/JS）proxy 到 Ricky 的 Worker（Ricky 更新後自動生效）
- 靜態頁面網址：`wrangler.installer.toml` 裡的 `STATIC_ORIGIN`

**更新 installer bundle 的時機**：修改了任何 `src/` 程式碼後都要重新 `npm run deploy`，bundle 會自動更新。

---

## 目錄結構

```
finance-app/
├── src/
│   ├── index.ts                  # Hono app 入口（Ricky 的版本）
│   ├── installer-entry.ts        # 朋友的 Worker 模板（proxy 靜態檔案）
│   └── routes/
│       ├── transactions.ts       # 收支 + 轉帳 CRUD
│       ├── investments.ts        # 投資 CRUD
│       ├── assets.ts
│       ├── recurring.ts
│       ├── reconcile.ts
│       ├── categories.ts
│       └── installer.ts          # 安裝程式 API（呼叫 Cloudflare API）
├── public/
│   ├── index.html                # 總攬
│   ├── transactions.html         # 消費紀錄
│   ├── investments.html          # 投資
│   ├── reconcile.html            # 對帳
│   ├── recurring.html            # 定期項目
│   ├── add.html                  # 快速新增（手機主畫面）
│   ├── install.html              # 安裝頁面（給朋友用）
│   ├── installer-worker.js       # 編譯好的 Worker bundle（自動生成）
│   ├── css/style.css
│   └── js/api.js                 # API 呼叫 + 共用 helpers
├── scripts/
│   └── build-installer.js        # build installer bundle 腳本
├── wrangler.toml                 # Ricky 的部署設定
└── wrangler.installer.toml       # build installer bundle 用的設定
```

---

## 顏色系統

全系統依語意套用固定顏色，**不顯示正負號**：

| 語意 | 顏色變數 | Hex |
|------|----------|-----|
| 資產、市值 | `var(--accent)` | `#58a6ff`（藍） |
| 支出、負債、虧損 | `var(--danger)` | `#f85149`（紅） |
| 收入、盈餘、獲利 | `var(--success)` | `#3fb950`（綠） |

---

## 共用 Helpers（`public/js/api.js`）

- `formatMoney(n)` — 回傳 `NT$xx,xxx`，內部用 `Math.abs`，不帶符號
- `fmtSigned(amount)` — 回傳 `$xx,xxx`，不帶正負號
- `formatReturn(rate)` — 回傳 `xx.xx%`，不帶正負號
- `amtColor(type)` — 收入回傳 `var(--success)`，否則 `var(--danger)`

---

## 重要規則

### 金額顯示
- 全系統禁止 `+` / `-` 符號，一律靠顏色傳達方向
- `formatMoney`、`fmtSigned`、`formatReturn` 已全部改為回傳絕對值

### 行動版（Mobile）
- 斷點：`768px`
- overflow 修正：在 `.main` 加 `width:100%; max-width:100vw; overflow-x:hidden`（不能只加在 body）
- 手機隱藏編輯/刪除按鈕，點擊整列開啟 modal
- 刪除按鈕放在 modal 內部（左下角），桌機不顯示

### 連動刪除
- 刪除轉帳紀錄 → 同時刪除對應的 investment trade 並回復股票持倉
- 關聯欄位：`investment_trades.transfer_id`
- 邏輯位置：`src/routes/transactions.ts` DELETE handler

### iCloud Drive 衝突
- iCloud 同步有時會把 `transactions.html`、`investments.html` 改名成 `*2.html`，造成 404
- 修法：`Rename-Item "...filename 2.html" "filename.html"` 後重新 deploy
- **每次 deploy 前先確認檔名沒有被改掉**

### 日曆
- 週六、週日的日期數字顯示紅色（`#f85149`）

### 每日小計
- 出現在每日交易列表底部，靠右對齊
- 格式：`收入 xx,xxx`（綠）`支出 xx,xxx`（紅），間距 `gap:14px`
- `padding-right:92px`（為了不貼到右側按鈕）
- `font-size:13px; font-weight:600`
- 只有當天有 2 筆以上交易才顯示
