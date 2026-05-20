// 订单路由
import { Hono } from 'hono'
import type { Env } from '../index'
import { generateOrderNumber, parseJSON } from '../db/utils'

const orders = new Hono<{ Bindings: Env }>()

// 创建订单（从购物车结算）
orders.post('/', async (c) => {
  const db = c.env.DB
  const body = await c.req.json()
  
  const orderNumber = generateOrderNumber()
  const items = body.items
  const subtotal = body.subtotal
  const shipping = body.shipping_cost || 0
  const tax = body.tax || 0
  const total = body.total

  await db.prepare(`
    INSERT INTO orders (order_number, customer_email, customer_name, customer_phone, shipping_address, items, subtotal, shipping_cost, tax, total, currency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    orderNumber,
    body.customer_email || null,
    body.customer_name || null,
    body.customer_phone || null,
    JSON.stringify(body.shipping_address || {}),
    JSON.stringify(items),
    subtotal, shipping, tax, total,
    body.currency || 'USD'
  ).run()

  return c.json({ orderNumber, message: 'Order created' })
})

// 获取订单列表 (Admin)
orders.get('/', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = (page - 1) * limit
  const status = c.req.query('status')
  const search = c.req.query('search')

  let sql = 'SELECT * FROM orders'
  let countSql = 'SELECT COUNT(*) as total FROM orders'
  const params: any[] = []
  const conditions: string[] = []

  if (status) { conditions.push('order_status = ?'); params.push(status) }
  if (search) { conditions.push('(customer_email LIKE ? OR customer_name LIKE ? OR order_number LIKE ?)'); const s = `%${search}%`; params.push(s, s, s) }

  if (conditions.length > 0) {
    const where = ' WHERE ' + conditions.join(' AND ')
    sql += where
    countSql += where
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(limit, offset)

  const [orders, countResult] = await Promise.all([
    db.prepare(sql).bind(...params).all(),
    db.prepare(countSql).bind(...params.slice(0, -2)).first()
  ])

  return c.json({
    items: (orders.results as any[]).map(o => ({
      ...o,
      items: parseJSON(o.items, []),
      shipping_address: parseJSON(o.shipping_address, {}),
    })),
    pagination: {
      page, limit,
      total: (countResult as any)?.total || 0,
      totalPages: Math.ceil(((countResult as any)?.total || 0) / limit)
    }
  })
})

// 查询单个订单（通过订单号或ID）
orders.get('/:identifier', async (c) => {
  const db = c.env.DB
  const identifier = c.req.param('identifier')
  
  const order = await db.prepare('SELECT * FROM orders WHERE order_number = ? OR id = ?').bind(identifier, parseInt(identifier) || 0).first() as any
  if (!order) return c.json({ error: 'Order not found' }, 404)

  return c.json({
    ...order,
    items: parseJSON(order.items, []),
    shipping_address: parseJSON(order.shipping_address, {}),
  })
})

// 更新订单状态 (Admin)
orders.patch('/:id/status', async (c) => {
  const db = c.env.DB
  const id = parseInt(c.req.param('id'))
  const { order_status, payment_status, tracking_number, tracking_url } = await c.req.json()

  const fields: string[] = []
  const params: any[] = []

  if (order_status) { fields.push('order_status = ?'); params.push(order_status) }
  if (payment_status) { fields.push('payment_status = ?'); params.push(payment_status) }
  if (tracking_number) { fields.push('tracking_number = ?'); params.push(tracking_number) }
  if (tracking_url) { fields.push('tracking_url = ?'); params.push(tracking_url) }

  if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400)

  fields.push('updated_at = datetime("now")')
  params.push(id)

  await db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).bind(...params).run()
  return c.json({ message: 'Order updated' })
})

export { orders }
