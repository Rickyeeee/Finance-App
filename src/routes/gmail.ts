import { Hono } from 'hono'
import type { Bindings } from '../types'
import { syncGmailWithDB } from '../services/gmail'
import { upsertDailySummary } from '../db/queries'

const app = new Hono<{ Bindings: Bindings }>()

// 手動觸發 Gmail 同步
app.post('/sync', async (c) => {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = c.env

  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    return c.json({ ok: false, error: 'Gmail OAuth 尚未設定，請先完成 OAuth 授權流程' }, 400)
  }

  try {
    const result = await syncGmailWithDB(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, c.env.DB)

    // 若有同步到資料，更新每日摘要
    if (result.synced > 0) {
      const today = new Date().toISOString().slice(0, 10)
      const totalAmount = result.transactions.reduce((s, t) => s + t.amount, 0)
      const lines = result.transactions.map(t => `• ${t.name} $${t.amount.toLocaleString()}`)
      const summaryText = `📊 ${today} 消費摘要\n共 ${result.synced} 筆，總金額 $${totalAmount.toLocaleString()}\n\n${lines.join('\n')}\n\n已寫入系統 ✅`

      await upsertDailySummary(c.env.DB, today, {
        total_amount: totalAmount,
        transaction_count: result.synced,
        summary_text: summaryText,
      })
    }

    return c.json({ ok: true, ...result })
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 500)
  }
})

// OAuth 授權起點（取得授權網址）
app.get('/oauth/url', async (c) => {
  const { GMAIL_CLIENT_ID } = c.env
  if (!GMAIL_CLIENT_ID) {
    return c.json({ ok: false, error: '未設定 GMAIL_CLIENT_ID' }, 400)
  }

  const redirectUri = `${new URL(c.req.url).origin}/api/gmail/oauth/callback`
  const scope = 'https://www.googleapis.com/auth/gmail.readonly'
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', GMAIL_CLIENT_ID)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scope)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')

  return c.json({ ok: true, url: url.toString(), redirect_uri: redirectUri })
})

// OAuth callback（將 code 換成 refresh_token）
app.get('/oauth/callback', async (c) => {
  const code = c.req.query('code')
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = c.env

  if (!code) return c.text('缺少 code 參數', 400)
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) return c.text('未設定 OAuth 憑證', 400)

  const redirectUri = `${new URL(c.req.url).origin}/api/gmail/oauth/callback`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const data = await res.json() as { refresh_token?: string; error?: string }

  if (!res.ok || !data.refresh_token) {
    return c.html(`
      <h2>授權失敗</h2>
      <p>${data.error ?? '未取得 refresh_token'}</p>
    `)
  }

  return c.html(`
    <html>
    <head><style>body{font-family:monospace;background:#0d1117;color:#c9d1d9;padding:2rem}</style></head>
    <body>
      <h2>✅ Gmail OAuth 授權成功</h2>
      <p>請將以下 Refresh Token 複製並設定到 wrangler.toml 或 Cloudflare 環境變數中：</p>
      <pre style="background:#161b22;padding:1rem;border-radius:8px;border:1px solid #30363d;word-break:break-all">${data.refresh_token}</pre>
      <p>設定方式：<br>
      <code>wrangler secret put GMAIL_REFRESH_TOKEN</code><br>
      然後貼上上面的 token</p>
    </body>
    </html>
  `)
})

export default app
