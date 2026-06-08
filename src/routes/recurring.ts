import { Hono } from 'hono'
import type { Bindings } from '../types'
import { getRecurring, createRecurring, updateRecurring, deleteRecurring, processRecurring } from '../db/queries'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
  const data = await getRecurring(c.env.DB)
  return c.json({ ok: true, data })
})

app.post('/', async (c) => {
  const body = await c.req.json()
  const startDate = body.start_date || body.next_date
  if (!body.name || !body.amount || !body.category || !startDate) {
    return c.json({ ok: false, error: '缺少必填欄位' }, 400)
  }
  body.start_date = startDate
  body.next_date = startDate
  const id = await createRecurring(c.env.DB, body)
  return c.json({ ok: true, id })
})

app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const ok = await updateRecurring(c.env.DB, id, body)
  return c.json({ ok })
})

app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const ok = await deleteRecurring(c.env.DB, id)
  return c.json({ ok })
})

// 手動觸發：立即生成所有到期的定期記錄
app.post('/process', async (c) => {
  const count = await processRecurring(c.env.DB)
  return c.json({ ok: true, count })
})

export default app
