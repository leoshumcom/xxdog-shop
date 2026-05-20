-- =============================================================
-- 初始数据
-- =============================================================

-- 管理员（密码：admin123 的 bcrypt hash，需实际注册时生成）
INSERT OR IGNORE INTO settings (key, value) VALUES ('site_name', 'XXDOG');
INSERT OR IGNORE INTO settings (key, value) VALUES ('site_tagline', 'Your Premium Fashion Destination');
INSERT OR IGNORE INTO settings (key, value) VALUES ('site_email', 'hello@xxdog.com');
INSERT OR IGNORE INTO settings (key, value) VALUES ('site_currency', 'USD');
INSERT OR IGNORE INTO settings (key, value) VALUES ('shipping_base_rate', '5.99');
INSERT OR IGNORE INTO settings (key, value) VALUES ('shipping_free_threshold', '50');
INSERT OR IGNORE INTO settings (key, value) VALUES ('tax_rate', '0');

-- 初始分类
INSERT OR IGNORE INTO categories (name, slug, description, sort_order) VALUES
  ('Shoes', 'shoes', 'Premium sneakers, loafers, boots and more', 1),
  ('Hats & Caps', 'hats-caps', 'Stylish hats, caps, beanies and fedoras', 2),
  ('Clothing', 'clothing', 'T-shirts, hoodies, jackets and more', 3),
  ('Accessories', 'accessories', 'Belts, scarves, bags and other accessories', 4);

-- 初始子分类：Shoes
INSERT OR IGNORE INTO categories (name, slug, parent_id, description, sort_order) VALUES
  ('Sneakers', 'sneakers', 1, 'Casual and sport sneakers', 1),
  ('Loafers', 'loafers', 1, 'Elegant slip-on loafers', 2),
  ('Boots', 'boots', 1, 'Ankle boots, combat boots and more', 3),
  ('Sandals', 'sandals', 1, 'Summer sandals and slides', 4);

-- 初始子分类：Hats
INSERT OR IGNORE INTO categories (name, slug, parent_id, description, sort_order) VALUES
  ('Baseball Caps', 'baseball-caps', 2, 'Classic baseball caps', 1),
  ('Beanies', 'beanies', 2, 'Warm knit beanies', 2),
  ('Bucket Hats', 'bucket-hats', 2, 'Trendy bucket hats', 3),
  ('Fedoras', 'fedoras', 2, 'Classy fedora hats', 4);

-- 初始子分类：Clothing
INSERT OR IGNORE INTO categories (name, slug, parent_id, description, sort_order) VALUES
  ('T-Shirts', 't-shirts', 3, 'Comfortable cotton t-shirts', 1),
  ('Hoodies', 'hoodies', 3, 'Cozy hoodies and sweatshirts', 2),
  ('Jackets', 'jackets', 3, 'Stylish outerwear', 3),
  ('Pants', 'pants', 3, 'Jeans, chinos and more', 4);

-- 初始子分类：Accessories
INSERT OR IGNORE INTO categories (name, slug, parent_id, description, sort_order) VALUES
  ('Belts', 'belts', 4, 'Leather and canvas belts', 1),
  ('Scarves', 'scarves', 4, 'Fashion scarves', 2),
  ('Bags', 'bags', 4, 'Backpacks, totes and more', 3),
  ('Wallets', 'wallets', 4, 'Minimalist wallets', 4);

-- 默认页面
INSERT OR IGNORE INTO pages (title, slug, content, is_published) VALUES
  ('About Us', 'about', '# About XXDOG\n\nWelcome to XXDOG — your premium destination for fashion-forward shoes, hats, clothing, and accessories.\n\n## Our Story\n\nFounded with a passion for style and quality, XXDOG curates the finest fashion pieces from around the world. We believe that great style should be accessible to everyone.\n\n## Our Mission\n\nTo bring you the latest trends with uncompromising quality, at prices that make sense. Every product is handpicked for its design, durability, and comfort.', 1),
  ('Contact', 'contact', '# Contact Us\n\nHave a question? We''d love to hear from you.\n\n**Email:** hello@xxdog.com\n\n**Customer Service Hours:**\nMonday - Friday: 9:00 AM - 6:00 PM (EST)\n\nWe aim to respond within 24 hours.', 1),
  ('Shipping & Returns', 'shipping-returns', '# Shipping & Returns\n\n## Shipping\n\n- **Standard Shipping:** $5.99 (5-8 business days)\n- **Express Shipping:** $15.99 (2-3 business days)\n- **Free Shipping** on orders over $50\n\nWe ship worldwide. International shipping times may vary.\n\n## Returns\n\nWe offer a 30-day return policy on all unworn, unwashed items with tags attached.\n\n- Items must be returned within 30 days of delivery\n- Refunds are processed within 5-7 business days\n- Original shipping costs are non-refundable\n\nTo start a return, email us at hello@xxdog.com', 1);
