// SEO 工具路由 - 管理端辅助
import { Hono } from 'hono'
import type { Env } from '../index'

const seo = new Hono<{ Bindings: Env }>()

// 获取SEO概览数据
seo.get('/overview', async (c) => {
  const db = c.env.DB

  const [productCount, blogCount, activeProductCount, publishedPostCount] = await Promise.all([
    db.prepare('SELECT COUNT(*) as c FROM products').first(),
    db.prepare('SELECT COUNT(*) as c FROM blog_posts').first(),
    db.prepare('SELECT COUNT(*) as c FROM products WHERE is_active = 1').first(),
    db.prepare('SELECT COUNT(*) as c FROM blog_posts WHERE is_published = 1').first(),
  ])

  // 检查哪些产品缺少SEO元数据
  const missingSeo = await db.prepare("SELECT COUNT(*) as c FROM products WHERE is_active = 1 AND (seo_title IS NULL OR seo_description IS NULL)").first()
  const missingBlogSeo = await db.prepare("SELECT COUNT(*) as c FROM blog_posts WHERE is_published = 1 AND (seo_title IS NULL OR seo_description IS NULL)").first()

  return c.json({
    products: {
      total: (productCount as any)?.c || 0,
      active: (activeProductCount as any)?.c || 0,
      missingSeo: (missingSeo as any)?.c || 0,
    },
    blog: {
      total: (blogCount as any)?.c || 0,
      published: (publishedPostCount as any)?.c || 0,
      missingSeo: (missingBlogSeo as any)?.c || 0,
    },
    sitemapUrl: 'https://xxdog.com/sitemap.xml'
  })
})

// 自动生成SEO元数据（基于产品信息）
seo.post('/generate-product-seo/:id', async (c) => {
  const db = c.env.DB
  const id = parseInt(c.req.param('id'))

  const product = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first() as any
  if (!product) return c.json({ error: 'Product not found' }, 404)

  const seoTitle = product.seo_title || `${product.title} | XXDOG Fashion`
  const seoDescription = product.seo_description || `Shop ${product.title} at XXDOG. Premium quality, fast shipping. ✓ Best Price ✓ Free Shipping over $50 ✓ 30-Day Returns`

  await db.prepare('UPDATE products SET seo_title = ?, seo_description = ?, updated_at = datetime("now") WHERE id = ?')
    .bind(seoTitle, seoDescription, id).run()

  return c.json({ seo_title: seoTitle, seo_description: seoDescription })
})

// 批量生成SEO元数据
seo.post('/generate-all-seo', async (c) => {
  const db = c.env.DB
  const missing = await db.prepare("SELECT id, title FROM products WHERE is_active = 1 AND (seo_title IS NULL OR seo_description IS NULL)").all()

  let updated = 0
  for (const p of missing.results as any[]) {
    const seoTitle = `${p.title} | XXDOG Fashion`
    const seoDesc = `Shop ${p.title} at XXDOG. Premium quality, fast shipping worldwide. ✓ Best Price ✓ Free Shipping over $50 ✓ 30-Day Returns`
    await db.prepare('UPDATE products SET seo_title = ?, seo_description = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(seoTitle, seoDesc, p.id).run()
    updated++
  }

  return c.json({ updated, message: `SEO metadata generated for ${updated} products` })
})

export { seo }
