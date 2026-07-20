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
  card: string
}

export function parseSinopacBillText(text: string): BillItem[] {
  const items: BillItem[] = []
  const currentYear = new Date().getFullYear()

  // 把 PDF 抽出的文字正規化：壓縮空白、保留換行
  const lines = text.split(/\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)

  // 永豐帳單真實消費格式：
  //   消費日(MM/DD)  入帳日(MM/DD)  卡號末4碼(4位數)  帳單說明  臺幣金額
  // 關鍵：必須有卡號末4碼，否則不是消費明細（例如自扣入帳那行就沒有卡號）
  //
  // PDF.js 擷取的文字可能把同一列拆成多個 token，所以用 token 掃描而非逐行 regex
  const dateRe = /^\d{2}\/\d{2}$/
  const cardRe = /^\d{4}$/
  const amountRe = /^[－—–‐\-]?[\d,]+[－—–‐\-]?$/

  // 將所有 token 合成一個陣列
  const tokens = lines.flatMap(l => l.split(' ')).filter(Boolean)

  let i = 0
  while (i < tokens.length) {
    // 找消費日 MM/DD
    if (!dateRe.test(tokens[i])) { i++; continue }
    const txnDate = tokens[i]

    // 下一個 token 應為入帳日 MM/DD
    if (i + 1 >= tokens.length || !dateRe.test(tokens[i + 1])) { i++; continue }

    // 再下一個 token 應為卡號末4碼（4位純數字）
    if (i + 2 >= tokens.length || !cardRe.test(tokens[i + 2])) { i++; continue }
    const cardLast4 = tokens[i + 2]

    // 從 i+3 開始收集帳單說明，直到遇到金額（純數字含逗號，可能有負號）
    let j = i + 3
    const nameParts: string[] = []
    while (j < tokens.length && !amountRe.test(tokens[j])) {
      nameParts.push(tokens[j])
      j++
    }
    if (j >= tokens.length || !nameParts.length) { i++; continue }

    // 統一各種減號格式（含前置、尾端、獨立 token）
    const normalizedRaw = tokens[j].replace(/[－—–‐]/g, '-')
    const isTrailingMinus = /[\d,]-$/.test(normalizedRaw)
    let amount = parseInt(normalizedRaw.replace(/,/g, '').replace(/-$/, ''), 10) * (isTrailingMinus ? -1 : 1)

    // 負號是獨立的下一個 token（如 `100 -`）
    let nextIdx = j + 1
    if (nextIdx < tokens.length && /^[－—–‐\-]$/.test(tokens[nextIdx])) {
      amount = -Math.abs(amount)
      nextIdx++
    }

    // 負數金額（折抵、退款）也保留，讓上層決定怎麼處理
    const name = nameParts.join(' ').slice(0, 60)

    // 解析消費日為 YYYY-MM-DD
    const [mm, dd] = txnDate.split('/')
    const date = `${currentYear}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`

    // nameParts 裡出現日期 token 代表 parser 跑偏，跳過這筆
    const hasDateInName = nameParts.some(p => dateRe.test(p))
    if (name && !isNaN(amount) && amount !== 0 && !hasDateInName) {
      items.push({ name, amount, date, card: cardLast4 })
    }

    i = nextIdx
  }

  // 合併國外交易服務費／手續費到前一筆（同日期）
  const merged: BillItem[] = []
  for (const item of items) {
    if (
      merged.length > 0 &&
      item.date === merged[merged.length - 1].date &&
      (item.name.includes('國外交易服務費') || item.name.includes('國外交易手續費'))
    ) {
      merged[merged.length - 1].amount += item.amount
    } else {
      merged.push(item)
    }
  }
  return merged
}
