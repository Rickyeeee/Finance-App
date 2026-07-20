#!/usr/bin/env node
/**
 * 在所有 HTML 檔案的 JS/CSS 引用加上 ?v=TIMESTAMP
 * 確保每次 deploy 後瀏覽器和 CDN 一定抓新版本
 */

const fs = require('fs')
const path = require('path')

const publicDir = path.join(__dirname, '..', 'public')
const version = Date.now()

fs.writeFileSync(path.join(publicDir, 'version.txt'), String(version))

const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'))

let updated = 0
for (const file of htmlFiles) {
  const fp = path.join(publicDir, file)
  let content = fs.readFileSync(fp, 'utf8')
  let newContent = content
    // 更新 JS/CSS 版本號（SW cache-first 靠版本號識別新舊）
    .replace(/(\/(?:js|css)\/[^"'?]+)(?:\?v=\d+)?(?=['"])/g, `$1?v=${version}`)
    // 移除舊的 auto-reload snippet（改由 SW stale-while-revalidate 處理頁面更新）
    .replace(/<script>\s*\(function\(\)\{var v='[^']*'[\s\S]*?\}\)\(\);\s*<\/script>\n?/g, '')
  if (newContent !== content) {
    fs.writeFileSync(fp, newContent)
    updated++
  }
}

console.log(`✅ injected ?v=${version} into ${updated} HTML files`)
