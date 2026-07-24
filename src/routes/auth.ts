import { Hono } from 'hono'
import type { Bindings } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

const CF_API = 'https://api.cloudflare.com/client/v4'

app.post('/login', async (c) => {
  const { pin } = await c.req.json<{ pin: string }>()
  if (!pin || pin !== c.env.AUTH_PIN) {
    return c.json({ ok: false, error: '密碼錯誤' }, 401)
  }
  return c.json({ ok: true, token: c.env.AUTH_TOKEN })
})

// 自助改密碼：驗證目前密碼後，透過 Cloudflare API 更新自己 Worker 上的 AUTH_PIN secret。
// 需要 CF_API_TOKEN、WORKER_NAME 這兩個 secret（安裝流程會自動設定；Ricky 自己的正式站
// 是手動建立的，沒有這兩個 secret，需要另外用 wrangler secret put 補上才能用這個功能）
app.post('/change-pin', async (c) => {
  const { currentPin, newPin } = await c.req.json<{ currentPin: string; newPin: string }>()

  if (!currentPin || currentPin !== c.env.AUTH_PIN) {
    return c.json({ ok: false, error: '目前密碼不正確' }, 401)
  }
  if (!newPin || newPin.length < 4) {
    return c.json({ ok: false, error: '新密碼至少需要 4 碼' }, 400)
  }
  if (newPin === currentPin) {
    return c.json({ ok: false, error: '新密碼不能跟目前密碼相同' }, 400)
  }
  if (!c.env.CF_API_TOKEN || !c.env.WORKER_NAME) {
    return c.json({ ok: false, error: '此環境尚未設定自助改密碼所需的 CF_API_TOKEN / WORKER_NAME，請改用 wrangler secret put AUTH_PIN' }, 400)
  }

  const accountsRes = await fetch(`${CF_API}/accounts?per_page=1`, {
    headers: { Authorization: `Bearer ${c.env.CF_API_TOKEN}` },
  }).then(r => r.json() as Promise<{ success: boolean; result?: Array<{ id: string }> }>)

  const accountId = accountsRes.success ? accountsRes.result?.[0]?.id : null
  if (!accountId) {
    return c.json({ ok: false, error: '無法驗證 Cloudflare 帳號，請確認 CF_API_TOKEN 是否有效' }, 500)
  }

  const putRes = await fetch(
    `${CF_API}/accounts/${accountId}/workers/scripts/${c.env.WORKER_NAME}/secrets`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${c.env.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'AUTH_PIN', text: newPin, type: 'secret_text' }),
    }
  ).then(r => r.json() as Promise<{ success: boolean }>)

  if (!putRes.success) {
    return c.json({ ok: false, error: '密碼更新失敗，請稍後再試' }, 500)
  }

  return c.json({ ok: true })
})

export default app
