// Gmail API integration - 永豐銀行刷卡通知解析

type GmailMessage = {
  id: string
  payload: {
    headers: { name: string; value: string }[]
    body: { data?: string }
    parts?: { mimeType: string; body: { data?: string } }[]
  }
  snippet: string
}

type ParsedTransaction = {
  name: string
  amount: number
  date: string
}

export async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`OAuth token refresh failed: ${res.status}`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

async function listMessages(accessToken: string, query: string): Promise<string[]> {
  const params = new URLSearchParams({ q: query, maxResults: '50' })
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return []
  const data = await res.json() as { messages?: { id: string }[] }
  return (data.messages ?? []).map(m => m.id)
}

async function getMessage(accessToken: string, messageId: string): Promise<GmailMessage | null> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  return res.json() as Promise<GmailMessage>
}

function decodeBase64(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  try {
    return decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    )
  } catch {
    return atob(base64)
  }
}

function extractBody(msg: GmailMessage): string {
  if (msg.payload.body?.data) return decodeBase64(msg.payload.body.data)
  if (msg.payload.parts) {
    for (const part of msg.payload.parts) {
      if ((part.mimeType === 'text/plain' || part.mimeType === 'text/html') && part.body?.data) {
        return decodeBase64(part.body.data)
      }
    }
  }
  return msg.snippet ?? ''
}

function getHeader(msg: GmailMessage, name: string): string {
  return msg.payload.headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

// 解析永豐銀行刷卡通知 email
function parseSinopacEmail(subject: string, body: string, dateHeader: string): ParsedTransaction | null {
  // 去除 HTML 標籤
  const text = body.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')

  // 金額：NT$ 或 NTD 或 TWD 後面的數字
  const amountPatterns = [
    /(?:NT\$|NTD|TWD|台幣)\s*([0-9,]+)/i,
    /消費金額[：:]\s*([0-9,]+)/,
    /交易金額[：:]\s*([0-9,]+)/,
    /金額[：:]\s*NT?\$?\s*([0-9,]+)/,
  ]
  let amount = 0
  for (const pattern of amountPatterns) {
    const match = text.match(pattern)
    if (match) {
      amount = parseInt(match[1].replace(/,/g, ''), 10)
      break
    }
  }
  if (!amount) return null

  // 消費地點/商店名稱
  const namePatterns = [
    /消費商店[：:]\s*([^\n\r<>，,。.]{2,30})/,
    /特店名稱[：:]\s*([^\n\r<>，,。.]{2,30})/,
    /消費地點[：:]\s*([^\n\r<>，,。.]{2,30})/,
    /商店[：:]\s*([^\n\r<>，,。.]{2,30})/,
  ]
  let name = ''
  for (const pattern of namePatterns) {
    const match = text.match(pattern)
    if (match) {
      name = match[1].trim()
      break
    }
  }

  // 若找不到商店名稱，從 subject 取
  if (!name) {
    const subjectMatch = subject.match(/(?:消費通知|刷卡通知)[：:\s]*([^\s]{2,20})/)
    if (subjectMatch) name = subjectMatch[1]
    else name = '消費'
  }

  // 消費日期：優先解析 email 內容的日期，否則用 email 送達日期
  const txDatePatterns = [
    /消費日期[：:]\s*(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
    /交易日期[：:]\s*(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
    /(\d{4})[\/\-.](\d{2})[\/\-.](\d{2})/,
  ]
  let date = ''
  for (const pattern of txDatePatterns) {
    const match = text.match(pattern)
    if (match) {
      const y = match[1], m = match[2].padStart(2, '0'), d = match[3].padStart(2, '0')
      date = `${y}-${m}-${d}`
      break
    }
  }
  if (!date) {
    // 從 email Date header 取
    const d = new Date(dateHeader)
    if (!isNaN(d.getTime())) {
      date = d.toISOString().slice(0, 10)
    } else {
      date = new Date().toISOString().slice(0, 10)
    }
  }

  return { name: name.slice(0, 50), amount, date }
}

export async function syncGmailTransactions(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<{ synced: number; skipped: number; errors: string[] }> {
  const accessToken = await getAccessToken(clientId, clientSecret, refreshToken)

  // 搜尋今天的永豐銀行刷卡通知
  const today = new Date().toISOString().slice(0, 10)
  const query = `from:sinopac OR from:永豐 subject:(刷卡 OR 消費 OR 信用卡) after:${today}`
  const ids = await listMessages(accessToken, query)

  let synced = 0
  let skipped = 0
  const errors: string[] = []

  return { synced, skipped, errors }
}

// 供 route 使用：帶入 DB 一起處理重複檢查
export async function syncGmailWithDB(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  db: D1Database
): Promise<{ synced: number; skipped: number; errors: string[]; transactions: ParsedTransaction[] }> {
  const accessToken = await getAccessToken(clientId, clientSecret, refreshToken)

  const todayDate = new Date()
  const yyyy = todayDate.getFullYear()
  const mm = String(todayDate.getMonth() + 1).padStart(2, '0')
  const dd = String(todayDate.getDate()).padStart(2, '0')
  const today = `${yyyy}/${mm}/${dd}`

  // 廣泛搜尋永豐刷卡通知
  const queries = [
    `from:ecard@sinopac.com after:${yyyy}/${mm}/${dd}`,
    `subject:永豐銀行信用卡消費通知 after:${yyyy}/${mm}/${dd}`,
    `subject:(刷卡通知 OR 消費通知) from:sinopac after:${yyyy}/${mm}/${dd}`,
  ]

  const allIds = new Set<string>()
  for (const q of queries) {
    const ids = await listMessages(accessToken, q)
    ids.forEach(id => allIds.add(id))
  }

  let synced = 0
  let skipped = 0
  const errors: string[] = []
  const transactions: ParsedTransaction[] = []

  for (const msgId of allIds) {
    try {
      const msg = await getMessage(accessToken, msgId)
      if (!msg) continue

      const subject = getHeader(msg, 'subject')
      const dateHeader = getHeader(msg, 'date')
      const body = extractBody(msg)
      const parsed = parseSinopacEmail(subject, body, dateHeader)
      if (!parsed) { skipped++; continue }

      // 檢查重複
      const existing = await db
        .prepare("SELECT id FROM transactions WHERE name = ? AND amount = ? AND date = ? AND source = 'Gmail自動'")
        .bind(parsed.name, parsed.amount, parsed.date)
        .first<{ id: string }>()

      if (existing) { skipped++; continue }

      // 寫入
      const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      await db.prepare('INSERT INTO transactions (id, name, amount, date, category, card, status, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, parsed.name, parsed.amount, parsed.date, '其他', '永豐', '待確認', 'Gmail自動')
        .run()

      synced++
      transactions.push(parsed)
    } catch (e) {
      errors.push(String(e))
    }
  }

  return { synced, skipped, errors, transactions }
}
