import { Hono } from 'hono'
import type { Bindings } from '../types'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../db/queries'

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
  const categories = await getCategories(c.env.DB)
  return c.json({ ok: true, data: categories })
})

app.post('/', async (c) => {
  const { name, type, sort_order, icon } = await c.req.json<{ name: string; type?: string; sort_order?: number; icon?: string }>()
  if (!name?.trim()) return c.json({ ok: false, error: '請輸入分類名稱' }, 400)
  const catType = type === '收入' ? '收入' : '支出'
  try {
    const id = await createCategory(c.env.DB, name.trim(), catType, sort_order, icon)
    return c.json({ ok: true, id }, 201)
  } catch {
    return c.json({ ok: false, error: '分類名稱已存在' }, 409)
  }
})

app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ name?: string; sort_order?: number; icon?: string | null }>()
  if (body.name !== undefined && !body.name.trim()) return c.json({ ok: false, error: '請輸入分類名稱' }, 400)
  const updateData: { name?: string; sort_order?: number; icon?: string | null } = {}
  if (body.name !== undefined) updateData.name = body.name.trim()
  if (body.sort_order !== undefined) updateData.sort_order = body.sort_order
  if ('icon' in body) updateData.icon = body.icon
  const ok = await updateCategory(c.env.DB, id, updateData)
  if (!ok) return c.json({ ok: false, error: '找不到此分類' }, 404)
  return c.json({ ok: true })
})

app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const ok = await deleteCategory(c.env.DB, id)
  if (!ok) return c.json({ ok: false, error: '找不到此分類' }, 404)
  return c.json({ ok: true })
})

// 修復舊紀錄：找出與現有分類名稱不完全相符的 category，自動比對並更新
app.post('/fix-records', async (c) => {
  const db = c.env.DB
  const { results: cats } = await db.prepare('SELECT name FROM categories').all<{ name: string }>()
  const catNames = cats.map(c => c.name)

  let fixed = 0

  // 取出 transactions 裡所有不在 categories 清單中的分類名稱
  const { results: txnCats } = await db.prepare('SELECT DISTINCT category FROM transactions').all<{ category: string }>()
  for (const { category: old } of txnCats) {
    if (catNames.includes(old)) continue
    // 找到名稱被包含在舊名稱裡的分類（處理 emoji 前綴的情況）
    const match = catNames.find(n => old.includes(n))
    if (match) {
      await db.prepare('UPDATE transactions SET category = ? WHERE category = ?').bind(match, old).run()
      fixed++
    }
  }

  // 同步修復定期項目
  const { results: recCats } = await db.prepare('SELECT DISTINCT category FROM recurring_transactions').all<{ category: string }>()
  for (const { category: old } of recCats) {
    if (catNames.includes(old)) continue
    const match = catNames.find(n => old.includes(n))
    if (match) {
      await db.prepare('UPDATE recurring_transactions SET category = ? WHERE category = ?').bind(match, old).run()
    }
  }

  return c.json({ ok: true, fixed })
})

export default app
