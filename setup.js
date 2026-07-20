#!/usr/bin/env node
/**
 * 財務系統一鍵安裝精靈
 * 執行：node setup.js
 */

const { execSync, spawnSync } = require('child_process')
const readline = require('readline')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const WRANGLER = process.platform === 'win32'
  ? `"${process.execPath}" node_modules/wrangler/bin/wrangler.js`
  : 'node node_modules/wrangler/bin/wrangler.js'

// ── 顏色輸出 ──
const c = {
  reset: '\x1b[0m',
  bold:  '\x1b[1m',
  green: '\x1b[32m',
  blue:  '\x1b[34m',
  yellow: '\x1b[33m',
  red:   '\x1b[31m',
  cyan:  '\x1b[36m',
}
const ok  = (s) => console.log(`${c.green}✓${c.reset} ${s}`)
const err = (s) => console.log(`${c.red}✗${c.reset} ${s}`)
const tip = (s) => console.log(`${c.cyan}→${c.reset} ${s}`)
const log = (s) => console.log(`  ${s}`)

// ── Prompt helper ──
function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve))
}

async function ask(rl, question, validator, hint) {
  while (true) {
    const answer = (await prompt(rl, `${c.bold}${question}${c.reset} `)).trim()
    if (!validator || validator(answer)) return answer
    console.log(`  ${c.yellow}${hint}${c.reset}`)
  }
}

// ── 執行指令（捕捉輸出）──
function run(cmd, opts = {}) {
  try {
    const result = spawnSync(cmd, { shell: true, encoding: 'utf8', ...opts })
    return { ok: result.status === 0, stdout: result.stdout || '', stderr: result.stderr || '' }
  } catch (e) {
    return { ok: false, stdout: '', stderr: String(e) }
  }
}

// ── Main ──
async function main() {
  console.log()
  console.log(`${c.bold}${c.blue}╔══════════════════════════════════════╗${c.reset}`)
  console.log(`${c.bold}${c.blue}║     個人財務系統  一鍵安裝精靈       ║${c.reset}`)
  console.log(`${c.bold}${c.blue}╚══════════════════════════════════════╝${c.reset}`)
  console.log()

  // ── 前置檢查 ──
  console.log(`${c.bold}【Step 1】環境檢查${c.reset}`)

  // Node.js
  const nodeVer = process.version
  ok(`Node.js ${nodeVer}`)

  // wrangler 存在
  if (!fs.existsSync('node_modules/wrangler/bin/wrangler.js')) {
    err('找不到 wrangler，請先執行 npm install')
    process.exit(1)
  }
  ok('wrangler 已安裝')

  // wrangler 登入狀態
  const whoami = run(`${WRANGLER} whoami`)
  if (!whoami.ok || whoami.stdout.includes('not authenticated')) {
    err('尚未登入 Cloudflare')
    tip('請先執行：node node_modules/wrangler/bin/wrangler.js login')
    tip('登入完成後再執行 node setup.js')
    process.exit(1)
  }
  // 取出 email
  const emailMatch = whoami.stdout.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/)
  ok(`已登入 Cloudflare${emailMatch ? `（${emailMatch[1]}）` : ''}`)
  console.log()

  // ── 個人化設定 ──
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  console.log(`${c.bold}【Step 2】個人化設定${c.reset}`)
  console.log()

  const appName = await ask(
    rl,
    '📛 App 名稱（顯示在標題與登入頁，例如：小明財務）：',
    v => v.length >= 1 && v.length <= 20,
    '請輸入 1-20 個字'
  )

  const workerName = await ask(
    rl,
    '🌐 Worker 名稱（決定網址，只能用英數字和連字號，例如：mingming-finance）：',
    v => /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(v),
    '只能用小寫英文、數字、連字號，且不能以連字號開頭或結尾'
  )

  const pin = await ask(
    rl,
    '🔐 登入 PIN 碼（4-12 位數字）：',
    v => /^\d{4,12}$/.test(v),
    '請輸入 4-12 位數字'
  )

  rl.close()
  console.log()

  // ── 確認 ──
  console.log(`${c.bold}即將安裝以下設定：${c.reset}`)
  log(`App 名稱：${c.cyan}${appName}${c.reset}`)
  log(`Worker 名稱：${c.cyan}${workerName}${c.reset}`)
  log(`網址：${c.cyan}https://${workerName}.${emailMatch ? workerName : '<你的帳號>'}.workers.dev${c.reset}`)
  log(`PIN：${c.cyan}${'*'.repeat(pin.length)}${c.reset}`)
  console.log()

  const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout })
  const confirm = await prompt(rl2, `${c.bold}確認繼續？(y/N)${c.reset} `)
  rl2.close()
  if (confirm.toLowerCase() !== 'y') {
    console.log('已取消。')
    process.exit(0)
  }
  console.log()

  // ── Step 3: 建立 D1 資料庫 ──
  console.log(`${c.bold}【Step 3】建立資料庫${c.reset}`)
  const dbName = `${workerName}-db`
  tip(`建立 D1 資料庫：${dbName}`)

  const createDb = run(`${WRANGLER} d1 create ${dbName}`)
  let databaseId = null

  if (createDb.ok) {
    const idMatch = (createDb.stdout + createDb.stderr).match(/database_id\s*=\s*"([a-f0-9-]{36})"/i)
      || (createDb.stdout + createDb.stderr).match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)
    if (idMatch) {
      databaseId = idMatch[1]
      ok(`資料庫建立成功（ID: ${databaseId}）`)
    } else {
      ok('資料庫建立成功')
      // 嘗試 list 取得 ID
      const listDb = run(`${WRANGLER} d1 list`)
      const listMatch = listDb.stdout.match(new RegExp(`${dbName}\\s+([a-f0-9-]{36})`))
      if (listMatch) databaseId = listMatch[1]
    }
  } else if ((createDb.stdout + createDb.stderr).includes('already exists')) {
    ok(`資料庫 ${dbName} 已存在，跳過建立`)
    // 從 list 取 ID
    const listDb = run(`${WRANGLER} d1 list`)
    const listMatch = listDb.stdout.match(new RegExp(`${dbName}[\\s│|]+([a-f0-9-]{36})`))
    if (listMatch) databaseId = listMatch[1]
  } else {
    err('資料庫建立失敗')
    console.log(createDb.stderr)
    process.exit(1)
  }

  if (!databaseId) {
    err('無法取得 database_id，請手動查詢並填入 wrangler.toml')
    tip(`執行：node node_modules/wrangler/bin/wrangler.js d1 list`)
  }
  console.log()

  // ── Step 4: 更新 wrangler.toml ──
  console.log(`${c.bold}【Step 4】更新設定檔${c.reset}`)
  let toml = fs.readFileSync('wrangler.toml', 'utf8')

  toml = toml.replace(/^name\s*=\s*".*"/m, `name = "${workerName}"`)
  toml = toml.replace(/^APP_NAME\s*=\s*".*"/m, `APP_NAME = "${appName}"`)
  toml = toml.replace(/^database_name\s*=\s*".*"/m, `database_name = "${dbName}"`)
  if (databaseId) {
    toml = toml.replace(/^database_id\s*=\s*".*"/m, `database_id = "${databaseId}"`)
  }

  fs.writeFileSync('wrangler.toml', toml)
  ok('wrangler.toml 已更新')
  console.log()

  // ── Step 5: 初始化資料庫 Schema ──
  console.log(`${c.bold}【Step 5】初始化資料庫${c.reset}`)
  tip('套用 schema.sql…')
  const initDb = run(`${WRANGLER} d1 execute ${dbName} --remote --file=schema.sql`)
  if (initDb.ok || initDb.stdout.includes('ok')) {
    ok('資料庫結構初始化完成')
  } else {
    err('資料庫初始化失敗')
    console.log(initDb.stderr)
    process.exit(1)
  }
  console.log()

  // ── Step 6: 設定 Secrets ──
  console.log(`${c.bold}【Step 6】設定 Secrets${c.reset}`)

  const authToken = crypto.randomUUID()
  const cronSecret = crypto.randomBytes(16).toString('hex')

  const secrets = [
    { key: 'AUTH_PIN',    value: pin },
    { key: 'AUTH_TOKEN',  value: authToken },
    { key: 'CRON_SECRET', value: cronSecret },
  ]

  for (const s of secrets) {
    tip(`設定 ${s.key}…`)
    const r = spawnSync(
      WRANGLER,
      ['secret', 'put', s.key],
      { shell: true, input: s.value + '\n', encoding: 'utf8' }
    )
    if (r.status === 0 || (r.stdout + r.stderr).includes('Success')) {
      ok(`${s.key} 設定完成`)
    } else {
      err(`${s.key} 設定失敗：${r.stderr}`)
    }
  }
  console.log()

  // ── Step 7: Deploy ──
  console.log(`${c.bold}【Step 7】部署${c.reset}`)
  tip('部署到 Cloudflare Workers…')
  const deploy = run(`${WRANGLER} deploy`)
  if (deploy.ok || deploy.stdout.includes('Deployed')) {
    ok('部署成功 🎉')
  } else {
    err('部署失敗')
    console.log(deploy.stderr)
    process.exit(1)
  }

  // ── 完成 ──
  const urlMatch = (deploy.stdout + deploy.stderr).match(/https:\/\/[^\s]+workers\.dev/)
  const appUrl = urlMatch ? urlMatch[0] : `https://${workerName}.workers.dev`

  console.log()
  console.log(`${c.bold}${c.green}╔══════════════════════════════════════╗${c.reset}`)
  console.log(`${c.bold}${c.green}║          安裝完成！                  ║${c.reset}`)
  console.log(`${c.bold}${c.green}╚══════════════════════════════════════╝${c.reset}`)
  console.log()
  console.log(`  App 名稱：${c.cyan}${appName}${c.reset}`)
  console.log(`  網址：    ${c.cyan}${appUrl}${c.reset}`)
  console.log(`  PIN 碼：  ${c.cyan}（你設定的 PIN）${c.reset}`)
  console.log()
  console.log(`  ${c.yellow}建議把網址加到手機主畫面，享受 PWA 體驗 📱${c.reset}`)
  console.log()
}

main().catch(e => {
  console.error('\n發生錯誤：', e.message)
  process.exit(1)
})
