#!/usr/bin/env node
/**
 * 建置安裝用 Worker bundle
 * 執行：node scripts/build-installer.js
 *
 * 輸出：public/installer-worker.js（供安裝程式部署給朋友）
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const WRANGLER = process.platform === 'win32'
  ? `"${process.execPath}" node_modules/wrangler/bin/wrangler.js`
  : 'node node_modules/wrangler/bin/wrangler.js'

console.log('🔨 Building installer worker bundle...')

// 建置（不 deploy）
try {
  execSync(
    `${WRANGLER} deploy --config wrangler.installer.toml --dry-run --outdir dist-installer`,
    { stdio: 'inherit' }
  )
} catch (e) {
  console.error('Build failed:', e.message)
  process.exit(1)
}

// 找輸出的 worker.js
const distDir = path.join(__dirname, '..', 'dist-installer')
const files = fs.readdirSync(distDir)
const workerFile = files.find(f => f.endsWith('.js'))

if (!workerFile) {
  console.error('找不到 compiled worker file in dist-installer/')
  process.exit(1)
}

// 複製到 public/，並把 import 語句移到最頂端（Cloudflare Workers ESM 要求）
const src = path.join(distDir, workerFile)
const dest = path.join(__dirname, '..', 'public', 'installer-worker.js')

let code = fs.readFileSync(src, 'utf8')
const importLines = []
const otherLines = []
for (const line of code.split('\n')) {
  if (/^import\s+/.test(line)) {
    importLines.push(line)
  } else {
    otherLines.push(line)
  }
}
if (importLines.length > 0) {
  code = [...importLines, '', ...otherLines].join('\n')
  console.log(`  Hoisted ${importLines.length} import statement(s) to top`)
}
fs.writeFileSync(dest, code)

console.log(`✅ installer-worker.js built → public/installer-worker.js`)
console.log(`   Size: ${(fs.statSync(dest).size / 1024).toFixed(1)} KB`)
console.log()
console.log('接下來執行 npm run deploy 把安裝頁面一起部署上去')
