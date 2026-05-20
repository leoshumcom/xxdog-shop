// DB 工具函数
export type DB = D1Database

export interface Product {
  id: number
  sku: string
  title: string
  slug: string
  description: string | null
  price: number
  compare_price: number | null
  cost_price: number | null
  stock: number
  weight: number | null
  images: string // JSON
  category_id: number | null
  tags: string // JSON
  variants: string // JSON
  variant_combinations: string // JSON
  is_active: number
  is_featured: number
  seo_title: string | null
  seo_description: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: number
  order_number: string
  customer_email: string | null
  customer_name: string | null
  customer_phone: string | null
  shipping_address: string | null
  billing_address: string | null
  items: string // JSON
  subtotal: number
  shipping_cost: number
  tax: number
  discount: number
  total: number
  currency: string
  payment_method: string | null
  payment_status: string
  order_status: string
  transaction_id: string | null
  tracking_number: string | null
  created_at: string
  updated_at: string
}

// 生成订单号
export function generateOrderNumber(): string {
  const date = new Date()
  const y = date.getFullYear().toString().slice(-2)
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `XD-${y}${m}${d}-${rand}`
}

// 生成SKU
export function generateSKU(categoryPrefix: string, index: number): string {
  return `XD-${categoryPrefix}-${String(index).padStart(4, '0')}`
}

// 生成slug
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80)
}

// 解析JSON字段
export function parseJSON<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

// 生成唯一slug（带后缀防止重复）
export async function uniqueSlug(db: DB, table: string, slug: string): Promise<string> {
  let finalSlug = slug
  let counter = 1
  while (true) {
    const existing = await db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).bind(finalSlug).first()
    if (!existing) return finalSlug
    finalSlug = `${slug}-${counter}`
    counter++
  }
}
