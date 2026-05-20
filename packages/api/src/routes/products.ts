// 产品路由
import { Hono } from 'hono'
import type { Env } from '../index'
import { slugify, uniqueSlug, generateSKU, parseJSON } from '../db/utils'

const products = new Hono<{ Bindings: Env }>()

// 获取产品列表（前台）
products.get('/', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit
  const category = c.req.query('category')
  const search = c.req.query('search')
  const sort = c.req.query('sort') || 'newest'
  const featured = c.req.query('featured')

  let sql = 'SELECT * FROM products WHERE is_active = 1'
  let countSql = 'SELECT COUNT(*) as total FROM products WHERE is_active = 1'
  const params: any[] = []
  const countParams: any[] = []

  if (category) {
    sql += ' AND category_id = ?'
    countSql += ' AND category_id = ?'
    params.push(parseInt(category))
    countParams.push(parseInt(category))
  }

  if (search) {
    sql += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)'
    countSql += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)'
    const s = `%${search}%`
    params.push(s, s, s)
    countParams.push(s, s, s)
  }

  if (featured === 'true') {
    sql += ' AND is_featured = 1'
    countSql += ' AND is_featured = 1'
  }

  // 排序
  switch (sort) {
    case 'price_asc': sql += ' ORDER BY price ASC'; break
    case 'price_desc': sql += ' ORDER BY price DESC'; break
    case 'oldest': sql += ' ORDER BY created_at ASC'; break
    default: sql += ' ORDER BY created_at DESC'
  }

  sql += ' LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const [products, countResult] = await Promise.all([
    db.prepare(sql).bind(...params).all(),
    db.prepare(countSql).bind(...countParams).first()
  ])

  // 格式化输出（解析JSON字段）
  const items = (products.results as any[]).map(p => ({
    ...p,
    images: parseJSON(p.images, []),
    tags: parseJSON(p.tags, []),
    variants: parseJSON(p.variants, []),
    variant_combinations: parseJSON(p.variant_combinations, []),
  }))

  return c.json({
    items,
    pagination: {
      page,
      limit,
      total: (countResult as any)?.total || 0,
      totalPages: Math.ceil(((countResult as any)?.total || 0) / limit)
    }
  })
})

// 获取单个产品
products.get('/:slug', async (c) => {
  const db = c.env.DB
  const slug = c.req.param('slug')
  
  const product = await db.prepare('SELECT * FROM products WHERE slug = ? AND is_active = 1').bind(slug).first() as any
  if (!product) return c.json({ error: 'Product not found' }, 404)

  // 获取同类热门产品
  const related = await db.prepare(
    'SELECT id, title, slug, price, images FROM products WHERE category_id = ? AND id != ? AND is_active = 1 ORDER BY created_at DESC LIMIT 4'
  ).bind(product.category_id, product.id).all()

  return c.json({
    ...product,
    images: parseJSON(product.images, []),
    tags: parseJSON(product.tags, []),
    variants: parseJSON(product.variants, []),
    variant_combinations: parseJSON(product.variant_combinations, []),
    related: related.results.map((r: any) => ({
      ...r,
      images: parseJSON(r.images, [])
    }))
  })
})

// ===== 管理端 API =====

// 新增产品 (Admin)
products.post('/', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  const title = body.title
  const slug = await uniqueSlug(db, 'products', slugify(title))
  const sku = body.sku || generateSKU('GEN', Date.now())

  const result = await db.prepare(`
    INSERT INTO products (sku, title, slug, description, price, compare_price, cost_price, stock, weight, images, category_id, tags, variants, variant_combinations, is_featured, seo_title, seo_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    sku,
    title,
    slug,
    body.description || null,
    body.price,
    body.compare_price || null,
    body.cost_price || null,
    body.stock || 0,
    body.weight || null,
    JSON.stringify(body.images || []),
    body.category_id || null,
    JSON.stringify(body.tags || []),
    JSON.stringify(body.variants || []),
    JSON.stringify(body.variant_combinations || []),
    body.is_featured ? 1 : 0,
    body.seo_title || null,
    body.seo_description || null
  ).run()

  return c.json({ id: result.meta.last_row_id, slug, sku, message: 'Product created' })
})

// 更新产品 (Admin)
products.put('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  const body = await c.req.json()

  // 先获取现有产品
  const existing = await db.prepare('SELECT * FROM products WHERE id = ?').bind(parseInt(id)).first() as any
  if (!existing) return c.json({ error: 'Product not found' }, 404)

  // 构建更新字段
  const fields: string[] = []
  const params: any[] = []
  
  const updateFields = ['title', 'description', 'price', 'compare_price', 'cost_price', 'stock', 'weight', 'category_id', 'is_active', 'is_featured', 'seo_title', 'seo_description']
  
  for (const field of updateFields) {
    if (body[field] !== undefined) {
      fields.push(`${field} = ?`)
      params.push(body[field])
    }
  }
  
  // JSON字段
  if (body.images) { fields.push('images = ?'); params.push(JSON.stringify(body.images)) }
  if (body.tags) { fields.push('tags = ?'); params.push(JSON.stringify(body.tags)) }
  if (body.variants) { fields.push('variants = ?'); params.push(JSON.stringify(body.variants)) }
  if (body.variant_combinations) { fields.push('variant_combinations = ?'); params.push(JSON.stringify(body.variant_combinations)) }
  
  // 如果有新的标题，更新slug
  if (body.title && body.title !== existing.title) {
    fields.push('slug = ?')
    params.push(await uniqueSlug(db, 'products', slugify(body.title)))
  }

  if (body.sku && body.sku !== existing.sku) {
    fields.push('sku = ?')
    params.push(body.sku)
  }

  fields.push('updated_at = datetime("now")')
  params.push(parseInt(id))

  const result = await db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).bind(...params).run()
  
  return c.json({ message: 'Product updated', changes: result.meta.changes })
})

// 删除产品 (Admin)
products.delete('/:id', async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  // 软删除
  await db.prepare('UPDATE products SET is_active = 0, updated_at = datetime("now") WHERE id = ?').bind(parseInt(id)).run()
  return c.json({ message: 'Product deleted' })
})

export { products }
