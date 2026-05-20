// ============================================================
// xxdog.com - Workers API (Hono)
// Cloudflare Workers + D1 + R2
// ============================================================
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { products } from './routes/products'
import { categories } from './routes/categories'
import { orders } from './routes/orders'
import { cart } from './routes/cart'
import { checkout } from './routes/checkout'
import { blog } from './routes/blog'
import { auth } from './routes/auth'
import { pages } from './routes/pages'
import { upload } from './routes/upload'
import { seo } from './routes/seo'

// 环境变量类型
export type Env = {
  DB: D1Database
  MEDIA: R2Bucket
  CART: KVNamespace
  JWT_SECRET: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  PAYPAL_CLIENT_ID?: string
  PAYPAL_SECRET_KEY?: string
  ADMIN_EMAIL?: string
}

const app = new Hono<{ Bindings: Env }>()

// ===== 全局中间件 =====
app.use('*', cors({
  origin: ['https://xxdog.com', 'https://www.xxdog.com', 'http://localhost:4321'],
  credentials: true,
}))

// 健康检查
app.get('/api/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }))

// ===== 路由 =====
app.route('/api/products', products)
app.route('/api/categories', categories)
app.route('/api/orders', orders)
app.route('/api/cart', cart)
app.route('/api/checkout', checkout)
app.route('/api/blog', blog)
app.route('/api/auth', auth)
app.route('/api/pages', pages)
app.route('/api/upload', upload)
app.route('/api/seo', seo)

// ===== Sitemap XML =====
app.get('/sitemap.xml', async (c) => {
  const db = c.env.DB
  const baseUrl = 'https://xxdog.com'
  
  const [products, categories, blogPosts, pages] = await Promise.all([
    db.prepare("SELECT slug, updated_at FROM products WHERE is_active = 1").all(),
    db.prepare("SELECT slug FROM categories WHERE is_active = 1").all(),
    db.prepare("SELECT slug, published_at FROM blog_posts WHERE is_published = 1").all(),
    db.prepare("SELECT slug FROM pages WHERE is_published = 1").all(),
  ])

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
  
  // 首页
  xml += `  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n`
  
  // 分类
  for (const cat of categories.results as any[]) {
    xml += `  <url><loc>${baseUrl}/category/${cat.slug}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`
  }

  // 产品
  for (const prod of products.results as any[]) {
    xml += `  <url><loc>${baseUrl}/products/${prod.slug}</loc><lastmod>${prod.updated_at?.split(' ')[0] || ''}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>\n`
  }

  // 博客
  for (const post of blogPosts.results as any[]) {
    xml += `  <url><loc>${baseUrl}/blog/${post.slug}</loc><lastmod>${post.published_at?.split(' ')[0] || ''}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n`
  }

  // 页面
  for (const page of pages.results as any[]) {
    xml += `  <url><loc>${baseUrl}/page/${page.slug}</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`
  }

  xml += `</urlset>`
  
  return c.newResponse(xml, 200, { 'Content-Type': 'application/xml' })
})

// ===== Robots.txt =====
app.get('/robots.txt', (c) => {
  const robots = `User-agent: *
Allow: /
Sitemap: https://xxdog.com/sitemap.xml`
  return c.newResponse(robots, 200, { 'Content-Type': 'text/plain' })
})

export default app
