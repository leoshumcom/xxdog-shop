-- =============================================================
-- xxdog.com 数据库结构
-- Cloudflare D1 (SQLite)
-- =============================================================

-- 用户（管理员）
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin' CHECK(role IN ('admin','editor','superadmin')),
  avatar_url TEXT,
  is_active INTEGER DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 分类
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id INTEGER DEFAULT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 产品
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  compare_price REAL,
  cost_price REAL,
  stock INTEGER DEFAULT 0,
  weight REAL,
  images TEXT DEFAULT '[]',        -- JSON: ["url1","url2"]
  category_id INTEGER,
  tags TEXT DEFAULT '[]',           -- JSON: ["tag1","tag2"]
  variants TEXT DEFAULT '[]',       -- JSON: [{name:"Color",options:["Red","Blue"]}]
  variant_combinations TEXT DEFAULT '[]',  -- JSON: [{sku,attrs:{Color:"Red",Size:"M"},price,stock,image}]
  is_active INTEGER DEFAULT 1,
  is_featured INTEGER DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 购物车（服务端同步用）
CREATE TABLE IF NOT EXISTS carts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT UNIQUE NOT NULL,
  items TEXT DEFAULT '[]',         -- JSON: [{product_id,sku,attrs:{},qty,price,title,image}]
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 订单
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  shipping_address TEXT,           -- JSON
  billing_address TEXT,            -- JSON (same as shipping if not set)
  items TEXT NOT NULL,             -- JSON: [{product_id,sku,title,qty,price,total,image,attrs}]
  subtotal REAL NOT NULL,
  shipping_cost REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  total REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT,             -- 'stripe' | 'paypal'
  payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending','paid','failed','refunded','partially_refunded')),
  order_status TEXT DEFAULT 'pending' CHECK(order_status IN ('pending','processing','shipped','delivered','cancelled','returned')),
  transaction_id TEXT,
  notes TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 博客文章
CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  cover_image TEXT,
  author TEXT,
  tags TEXT DEFAULT '[]',
  is_published INTEGER DEFAULT 0,
  published_at TEXT,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 网站设置
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 页面（关于/联系我们等）
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  is_published INTEGER DEFAULT 1,
  seo_title TEXT,
  seo_description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_blog_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_published ON blog_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
