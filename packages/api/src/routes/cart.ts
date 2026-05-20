// 购物车路由
import { Hono } from 'hono'
import type { Env } from '../index'

const cart = new Hono<{ Bindings: Env }>()

// 获取购物车（走KV，更快）
cart.get('/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')
  const carts = c.env.CART
  const data = await carts.get(`cart:${sessionId}`, 'json')
  return c.json(data || { items: [], total: 0 })
})

// 更新购物车
cart.put('/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')
  const body = await c.req.json()
  const carts = c.env.CART

  // 计算总价
  const items = (body.items || []) as any[]
  const total = items.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0)

  const cartData = { items, total, updatedAt: new Date().toISOString() }
  await carts.put(`cart:${sessionId}`, JSON.stringify(cartData), { expirationTtl: 86400 * 30 }) // 30天过期

  return c.json(cartData)
})

// 清空购物车
cart.delete('/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId')
  const carts = c.env.CART
  await carts.delete(`cart:${sessionId}`)
  return c.json({ items: [], total: 0 })
})

export { cart }
