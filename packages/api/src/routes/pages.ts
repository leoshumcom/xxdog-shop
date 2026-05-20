// 页面路由 (About, Contact, Shipping 等)
import { Hono } from 'hono'
import type { Env } from '../index'

const pages = new Hono<{ Bindings: Env }>()

// 获取公开页面
pages.get('/:slug', async (c) => {
  const db = c.env.DB
  const slug = c.req.param('slug')
  const page = await db.prepare('SELECT title, slug, content FROM pages WHERE slug = ? AND is_published = 1').bind(slug).first()
  if (!page) return c.json({ error: 'Page not found' }, 404)
  return c.json(page)
})

// 管理端：所有页面
pages.get('/', async (c) => {
  const db = c.env.DB
  const all = await db.prepare('SELECT id, title, slug, is_published, created_at, updated_at FROM pages ORDER BY created_at').all()
  return c.json(all.results)
})

// 获取网站设置
pages.get('/settings/list', async (c) => {
  const db = c.env.DB
  const settings = await db.prepare('SELECT key, value FROM settings').all()
  const result: Record<string, string> = {}
  for (const s of settings.results as any[]) {
    result[s.key] = s.value
  }
  return c.json(result)
})

// 更新设置
pages.post('/settings', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  for (const [key, value] of Object.entries(body)) {
    await db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime("now"))').bind(key, value).run()
  }
  
  return c.json({ message: 'Settings updated' })
})

export { pages }
