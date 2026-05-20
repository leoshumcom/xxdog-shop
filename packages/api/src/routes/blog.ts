// 博客路由
import { Hono } from 'hono'
import type { Env } from '../index'
import { slugify, uniqueSlug, parseJSON } from '../db/utils'

const blog = new Hono<{ Bindings: Env }>()

// 获取博客列表
blog.get('/', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '10')
  const offset = (page - 1) * limit
  const tag = c.req.query('tag')
  const search = c.req.query('search')

  let sql = 'SELECT id, title, slug, excerpt, cover_image, author, tags, is_published, published_at, created_at FROM blog_posts WHERE is_published = 1'
  let countSql = 'SELECT COUNT(*) as total FROM blog_posts WHERE is_published = 1'
  const params: any[] = []

  if (tag) {
    sql += ' AND tags LIKE ?'
    countSql += ' AND tags LIKE ?'
    params.push(`%"${tag}"%`)
  }

  if (search) {
    sql += ' AND (title LIKE ? OR content LIKE ?)'
    countSql += ' AND (title LIKE ? OR content LIKE ?)'
    const s = `%${search}%`
    params.push(s, s)
  }

  sql += ' ORDER BY published_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const [posts, countResult] = await Promise.all([
    db.prepare(sql).bind(...params).all(),
    db.prepare(countSql).bind(...params.slice(0, -2)).first()
  ])

  return c.json({
    items: (posts.results as any[]).map(p => ({ ...p, tags: parseJSON(p.tags, []) })),
    pagination: {
      page, limit,
      total: (countResult as any)?.total || 0,
      totalPages: Math.ceil(((countResult as any)?.total || 0) / limit)
    }
  })
})

// 获取单个博客
blog.get('/:slug', async (c) => {
  const db = c.env.DB
  const slug = c.req.param('slug')
  const post = await db.prepare('SELECT * FROM blog_posts WHERE slug = ? AND is_published = 1').bind(slug).first() as any
  
  if (!post) return c.json({ error: 'Post not found' }, 404)

  return c.json({
    ...post,
    tags: parseJSON(post.tags, [])
  })
})

// 管理端：获取所有博客（含草稿）
blog.get('/all', async (c) => {
  const db = c.env.DB
  const all = await db.prepare('SELECT id, title, slug, excerpt, cover_image, author, is_published, published_at, created_at FROM blog_posts ORDER BY created_at DESC').all()
  return c.json(all.results)
})

// 新增博客
blog.post('/', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  const slug = await uniqueSlug(db, 'blog_posts', slugify(body.title))
  const isPublished = body.is_published ? 1 : 0

  const result = await db.prepare(`
    INSERT INTO blog_posts (title, slug, content, excerpt, cover_image, author, tags, is_published, published_at, seo_title, seo_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    body.title, slug,
    body.content || null,
    body.excerpt || null,
    body.cover_image || null,
    body.author || null,
    JSON.stringify(body.tags || []),
    isPublished,
    isPublished ? new Date().toISOString() : null,
    body.seo_title || null,
    body.seo_description || null
  ).run()

  return c.json({ id: result.meta.last_row_id, slug, message: 'Post created' })
})

// 更新博客
blog.put('/:id', async (c) => {
  const db = c.env.DB
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()

  const fields: string[] = []
  const params: any[] = []

  const updatable = ['title', 'content', 'excerpt', 'cover_image', 'author', 'seo_title', 'seo_description']
  for (const f of updatable) {
    if (body[f] !== undefined) {
      fields.push(`${f} = ?`)
      params.push(body[f])
    }
  }

  if (body.tags) { fields.push('tags = ?'); params.push(JSON.stringify(body.tags)) }
  
  if (body.is_published !== undefined) {
    fields.push('is_published = ?')
    params.push(body.is_published ? 1 : 0)
    if (body.is_published) fields.push('published_at = datetime("now")')
  }

  if (body.title) {
    fields.push('slug = ?')
    params.push(await uniqueSlug(db, 'blog_posts', slugify(body.title)))
  }

  if (fields.length === 0) return c.json({ error: 'No fields' }, 400)

  fields.push('updated_at = datetime("now")')
  params.push(id)

  await db.prepare(`UPDATE blog_posts SET ${fields.join(', ')} WHERE id = ?`).bind(...params).run()
  return c.json({ message: 'Post updated' })
})

// 删除博客
blog.delete('/:id', async (c) => {
  const db = c.env.DB
  const id = parseInt(c.req.param('id'))
  await db.prepare('DELETE FROM blog_posts WHERE id = ?').bind(id).run()
  return c.json({ message: 'Post deleted' })
})

export { blog }
