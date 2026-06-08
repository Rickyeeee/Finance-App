import { Hono } from 'hono'
import type { Bindings } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

app.post('/login', async (c) => {
  const { pin } = await c.req.json<{ pin: string }>()
  if (!pin || pin !== c.env.AUTH_PIN) {
    return c.json({ ok: false, error: '密碼錯誤' }, 401)
  }
  return c.json({ ok: true, token: c.env.AUTH_TOKEN })
})

export default app
