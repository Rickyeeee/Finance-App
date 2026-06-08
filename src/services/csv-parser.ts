// Holdary CSV 解析 - 投資損益更新

export type HoldaryRow = {
  symbol: string
  name: string
  shares: number
  avg_cost: number
  market_price: number
  market_value: number
  profit_loss: number
  return_rate: number
}

function parseNumber(str: string): number {
  const cleaned = str.replace(/[,\s%]/g, '').replace(/[（(]/, '-').replace(/[）)]/, '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

export function parseHoldaryCSV(csvText: string): HoldaryRow[] {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  // 找標題行
  const headerIdx = lines.findIndex(l =>
    l.includes('股票') || l.includes('代號') || l.includes('symbol') || l.includes('Symbol')
  )
  if (headerIdx < 0) return []

  const headers = lines[headerIdx].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase())

  const rows: HoldaryRow[] = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 3) continue

    const get = (keys: string[]) => {
      for (const k of keys) {
        const idx = headers.findIndex(h => h.includes(k))
        if (idx >= 0 && cols[idx]) return cols[idx].trim().replace(/"/g, '')
      }
      return ''
    }

    const symbol = get(['代號', 'symbol', 'code', '股票代'])
    const name = get(['名稱', 'name', '股票名'])
    if (!symbol && !name) continue

    rows.push({
      symbol: symbol || '',
      name: name || symbol,
      shares: parseNumber(get(['股數', 'shares', '持股', '數量'])),
      avg_cost: parseNumber(get(['成本', 'cost', '均價', '平均'])),
      market_price: parseNumber(get(['現價', 'price', '市價', '收盤'])),
      market_value: parseNumber(get(['市值', 'value', '總值'])),
      profit_loss: parseNumber(get(['損益', 'profit', 'gain', '盈虧'])),
      return_rate: parseNumber(get(['報酬', 'return', 'rate', '報酬率', '%'])),
    })
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

// 永豐信用卡帳單 PDF 文字解析（PDF 已在前端轉為文字後傳入）
export type BillItem = {
  name: string
  amount: number
  date: string
}

export function parseSinopacBillText(text: string): BillItem[] {
  const items: BillItem[] = []
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // 永豐帳單格式：日期 商店名稱 金額
  // 例：06/01 全家便利商店 45
  // 或：2025/06/01  FamilyMart  NT$45
  const dateAmountPattern = /(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+(.+?)\s+([\d,]+)(?:\s|$)/
  const currentYear = new Date().getFullYear()

  for (const line of lines) {
    const match = line.match(dateAmountPattern)
    if (!match) continue

    const [, rawDate, name, rawAmount] = match
    const amount = parseInt(rawAmount.replace(/,/g, ''), 10)
    if (!amount || amount <= 0) continue

    // 解析日期
    const parts = rawDate.split(/[\/\-]/)
    let date = ''
    if (parts.length === 2) {
      date = `${currentYear}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
    } else if (parts.length === 3) {
      const y = parts[0].length === 4 ? parts[0] : `${currentYear}`
      const m = (parts[0].length === 4 ? parts[1] : parts[0]).padStart(2, '0')
      const d = (parts[0].length === 4 ? parts[2] : parts[1]).padStart(2, '0')
      date = `${y}-${m}-${d}`
    }
    if (!date) continue

    items.push({ name: name.trim().slice(0, 50), amount, date })
  }

  return items
}
