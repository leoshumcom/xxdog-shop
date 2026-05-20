// 分类路由
import { Hono } from 'hono'
import type { Env } from '../index'
import { slugify, uniqueSlug } from '../db/utils'

const categories = new Hono<{ Bindings: Env }>()

// 获取所有分类（树形结构，前台用）
categories.get('/', async (c) => {
  const db = c.env.DB
  const all = await db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order, name').all()
  
  const items = all.results as any[]
  
  // 构建树
  const map = new Map<number, any>()
  const roots: any[] = []

  items.forEach(item => {
    map.set(item.id, { ...item, children: [] })
  })

  items.forEach(item => {
    const node = map.get(item.id)
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id).children.push(node)
    } else if (!item.parent_id) {
      roots.push(node)
    }
  })

  return c.json(roots)
})

// 获取单条分类
categories.get('/:slug', async (c) => {
  const db = c.env.DB
  const slug = c.req.param('slug')
  
  const category = await db.prepare('SELECT * FROM categories WHERE slug = ? AND is_active = 1').bind(slug).first()
  if (!category) return c.json({ error: 'Category not found' }, 404)

  // 获取该分类下的产品数
  const count = await db.prepare('SELECT COUNT(*) as total FROM products WHERE category_id = ? AND is_active = 1').bind((category as any).id).first()

  return c.json({ ...category as any, productCount: (count as any)?.total || 0 })
})

// 新增分类 (Admin)
categories.post('/', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  const name = body.name
  const slug = await uniqueSlug(db, 'categories', slugify(name))

  const result = await db.prepare(`
    INSERT INTO categories (name, slug, parent_id, description, image_url, sort_order) 
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    name, slug,
    body.parent_id || null,
    body.description || null,
    body.image_url || null,
    body.sort_order || 0
  ).run()

  return c.json({ id: result.meta.last_row_id, slug, message: 'Category created' })
})

// 更新分类 (Admin)
categories.put('/:id', async (c) => {
  const db = c.env.DB
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()

  const fields: string[] = []
  const params: any[] = []

  const updatable = ['name', 'parent_id', 'description', 'image_url', 'sort_order', 'is_active']
  for (const f of updatable) {
    if (body[f] !== undefined) {
      fields.push(`${f} = ?`)
      params.push(body[f])
    }
  }

  if (body.name) {
    fields.push('slug = ?')
    params.push(await uniqueSlug(db, 'categories', slugify(body.name)))
  }

  if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400)
  
  fields.push('updated_at = datetime("now")')
  params.push(id)

  await db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).bind(...params).run()
  return c.json({ message: 'Category updated' })
})

// 删除分类 (Admin)
categories.delete('/:id', async (c) => {
  const db = c.env.DB
  const id = parseInt(c.req.param('id'))
  await db.prepare('UPDATE categories SET is_active = 0 WHERE id = ?').bind(id).run()
  // 子分类也禁用
  await db.prepare('UPDATE categories SET is_active = 0 WHERE parent_id = ?').bind(id).run()
  return c.json({ message: 'Category deleted' })
})

export { categories }
