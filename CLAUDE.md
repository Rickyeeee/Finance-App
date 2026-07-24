# Finance App — 專案說明

## 專案位置與備份

- **唯一開發路徑**：`D:\Projects\finance-app`，絕不放在 iCloud 或任何同步資料夾（同步軟體會損壞 node_modules 和 git 物件，曾造成程式碼遺失）
- **備份**：GitHub `Rickyeeee/finance-app`，重要改動後 commit + push
- **還原**：`git clone` 後 `npm install` + `npm run deploy`（資料在 Cloudflare D1，不受本地影響）
- `.env`、`.dev.vars` 不在 git 裡，需另外保管

---

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

專案是 SPA：`public/index.html` 是唯一的殼（shell），裡面用 `<template id="tpl-*">` 存放每頁的 DOM，`public/js/router.js` 切頁時用 `replaceChildren` 換內容、動態 `import` 對應的 `public/js/pages/*.js` 模組並呼叫其 `show({ signal })`。`transactions.html`、`investments.html`、`reconcile.html`、`report.html`、`add.html` 這些路徑都是**虛擬路由**，不是真的檔案。

```
finance-app/
├── src/
│   ├── index.ts                  # Hono app 入口（Ricky 的版本，含 SPA 路由 + /add manifest 動態切換）
│   ├── installer-entry.ts        # 朋友的 Worker 模板（proxy 靜態檔案）
│   ├── shortcut-generator.ts     # iOS 捷徑產生器（嵌入 token）
│   ├── bplist.ts                 # Binary plist encoder（純 TS，無外部依賴）
│   ├── types.ts
│   └── routes/
│       ├── transactions.ts       # 收支 + 轉帳 CRUD
│       ├── investments.ts        # 投資 CRUD
│       ├── assets.ts
│       ├── recurring.ts
│       ├── reconcile.ts
│       ├── categories.ts
│       └── installer.ts          # 安裝程式 API（呼叫 Cloudflare API）
├── public/
│   ├── index.html                # SPA shell：所有頁面共用的 template + splash + modal
│   ├── install.html              # 安裝頁面（給朋友用）
│   ├── shortcut-install.html     # iOS 捷徑安裝 + Token 複製
│   ├── installer-worker.js       # 編譯好的 Worker bundle（自動生成）
│   ├── _headers                  # 靜態資源 Cache-Control（Worker 沒執行時也生效，見下方教訓）
│   ├── css/style.css
│   └── js/
│       ├── router.js             # SPA router
│       ├── api.js                # API 呼叫 + 共用 helpers（modal 開關、swr 快取、scroll lock）
│       ├── txn-modal.js          # 共用新增/編輯支出收入/轉帳 modal
│       └── pages/                # 各頁邏輯：overview / transactions / investments / reconcile / report / add
├── scripts/
│   ├── build-installer.js        # build installer bundle 腳本
│   ├── generate-shortcut.js      # 產生靜態 .shortcut 檔
│   └── inject-version.js         # 注入版本號
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

**例外：投資頁（`investments.js`）**——台股看盤習慣是漲紅跌綠，跟上表相反。只有這一頁的損益/報酬率/漲跌數字、成長圖線、已實現損益表格套用「正值紅、負值綠」（`twColor()` helper），其他頁面不受影響。

---

## 共用 Helpers（`public/js/api.js`）

- `formatMoney(n)` — 回傳 `$xx,xxx`，內部用 `Math.abs`，不帶正負號。**全系統一律不顯示 `NT`，只用 `$`**
- `fmtSigned(amount)` — 回傳 `$xx,xxx`，不帶正負號
- `formatReturn(rate)` — 回傳 `xx.xx%`，不帶正負號
- `amtColor(type)` — 收入回傳 `var(--success)`，否則 `var(--danger)`

**投資頁（`investments.js`）例外**：本頁不用 `formatMoney`，改用自己的 `fmtNum()`（純數字，無 `$`）。只有最上面 4 張摘要卡（投資總市值／今日損益／未實現損益／已實現損益）用 `fmtTop()` 保留 `$`，其餘（持股卡片、個股詳情、明細列、已實現損益表、成長圖座標軸）一律不帶 `$`。

---

## 重要規則

### 金額顯示
- 全系統禁止 `+` / `-` 符號，一律靠顏色傳達方向
- `formatMoney`、`fmtSigned`、`formatReturn` 已全部改為回傳絕對值

### 行動版（Mobile）
- 斷點：`768px`
- overflow 修正：在 `.main` 加 `width:100%; max-width:100vw; overflow-x:hidden`（不能只加在 body）
- 交易列表（`.txn-row`）不分桌機/手機，一律不顯示編輯/刪除按鈕，點擊整列開啟 modal；`.txn-row` 要有 hover（桌機）/active（手機）的可點擊提示
- 刪除按鈕放在 modal 內部（左下角）

### 連動刪除
- 刪除轉帳紀錄 → 同時刪除對應的 investment trade 並回復股票持倉
- 關聯欄位：`investment_trades.transfer_id`
- 邏輯位置：`src/routes/transactions.ts` DELETE handler

### 同步軟體衝突（歷史教訓）
- 專案曾放在 iCloud Drive，同步造成：檔案被改名成 `* 2.html`、程式碼被回退、git 物件損壞
- 2026-07 已把專案移到 `D:\Projects\finance-app` 並重建 git，改用 GitHub 備份
- 若發現 `* 2.*` 命名的檔案，那是同步衝突產物，比對後刪除

### 日曆 / 左右滑動切換（3 格橫排 strip 手勢）
- 週六、週日的日期數字顯示紅色（`#f85149`）
- 月曆、消費紀錄的當日紀錄、對帳的帳戶明細都用同一套「3 格橫排跟手拖曳」手勢：外層 `.xxx-wrap`（`overflow:hidden`）＋內層 `.xxx-strip`（`display:flex; width:300%`，中間格對齊 `translateX(-33.333%)`）
- **電腦版只有月曆能滑動**（滑鼠 + 觸控），當日紀錄跟帳戶明細滑動只在手機（觸控）生效，不要加滑鼠事件
- 手機板：swipeable wrap 要加 `touch-action: pan-y`，否則瀏覽器原生垂直捲動判斷跟自己寫的水平手勢會搶手勢時序，造成畫面跳動
- 外層 wrap **不能**設 `display:flex`：內層 strip 的 `width:300%` 會被當成 flex item 被自動壓縮打回正常寬度，排版跑掉（曾經踩過這個坑）
- 如果 wrap 本身是被 flex 撐高（例如浮動視窗裡 `flex:1; min-height:0`），strip 跟裡面的 3 個面板都要補 `height:100%`，不然面板的 `overflow-y:auto` 沒有明確高度可比較，永遠不會觸發捲動（內容只是被外層 `overflow:hidden` 裁掉，不能捲）
- 若 wrap 是在一般文件流裡（例如消費紀錄的當日紀錄，不是浮動視窗），拖曳時先把 wrap 高度鎖住（`getBoundingClientRect().height` 存成 inline style），放開後才平滑動畫到新內容的高度，避免拖曳時撐高造成頁面跳動

### 每日小計
- 出現在每日交易列表底部，靠右對齊（`.txn-row` 已無按鈕，不用留 padding-right）
- 格式：`收入 xx,xxx`（綠）`支出 xx,xxx`（紅），間距 `gap:14px`
- `font-size:13px; font-weight:600`
- 只有當天有 2 筆以上交易才顯示
