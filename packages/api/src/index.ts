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

// ===== 首页 =====
app.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>XXDOG · Premium Fashion Destination</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;text-align:center}
.logo{font-size:4rem;font-weight:900;letter-spacing:-.05em;background:linear-gradient(135deg,#f5af19,#f12711);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.5rem}
.tagline{font-size:1.1rem;color:#888;margin-bottom:2rem}
.links{display:flex;gap:1rem;flex-wrap:wrap;justify-content:center}
.links a{color:#fff;text-decoration:none;padding:.75rem 1.5rem;border:1px solid #333;border-radius:100px;font-size:.9rem;transition:all .2s}
.links a:hover{border-color:#f5af19;background:rgba(245,175,25,.1)}
.status{margin-top:3rem;padding:1rem 2rem;background:rgba(255,255,255,.03);border-radius:12px;border:1px solid #222;color:#22c55e;font-size:.9rem}
.status:before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;margin-right:8px;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.info{color:#555;font-size:.8rem;margin-top:2rem}
.info code{background:#1a1a1a;padding:2px 6px;border-radius:4px}
</style>
</head>
<body>
<div class="logo">XXDOG</div>
<div class="tagline">Your Premium Fashion Destination</div>
<div class="links">
<a href="/api/products">Products API</a>
<a href="/api/health">Health</a>
<a href="/sitemap.xml">Sitemap</a>
</div>
<div class="status">System Online</div>
<div class="info">API: <code>api.xxdog.com/api</code> &middot; WWW: <code>xxdog.com</code> (Coming Soon)</div>
</body>
</html>`
  return c.html(html)
})

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
