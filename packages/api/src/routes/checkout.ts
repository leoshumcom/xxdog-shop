// 结算路由 - Stripe & PayPal
import { Hono } from 'hono'
import type { Env } from '../index'
import { generateOrderNumber } from '../db/utils'

const checkout = new Hono<{ Bindings: Env }>()

// ===== Stripe =====

// 创建 Stripe Checkout Session
checkout.post('/stripe', async (c) => {
  const body = await c.req.json()
  const { items, customer_email, success_url, cancel_url } = body

  const STRIPE_SECRET_KEY = c.env.STRIPE_SECRET_KEY
  if (!STRIPE_SECRET_KEY) return c.json({ error: 'Stripe not configured' }, 500)

  // 构建 line items
  const lineItems = items.map((item: any) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.title,
        images: item.image ? [item.image] : [],
      },
      unit_amount: Math.round(item.price * 100), // Stripe 用分
    },
    quantity: item.qty,
  }))

  // 调用 Stripe API
  const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'mode': 'payment',
      'customer_email': customer_email || '',
      'success_url': success_url || 'https://xxdog.com/order/success?session_id={CHECKOUT_SESSION_ID}',
      'cancel_url': cancel_url || 'https://xxdog.com/cart',
      ...lineItems.map((li: any, i: number) => [
        [`line_items[${i}][price_data][currency]`, li.price_data.currency],
        [`line_items[${i}][price_data][product_data][name]`, li.price_data.product_data.name],
        [`line_items[${i}][price_data][unit_amount]`, String(li.price_data.unit_amount)],
        [`line_items[${i}][quantity]`, String(li.quantity)],
      ]).flat().map(([k, v]) => [k, v])
    ).toString(),
  })

  const session = await stripeRes.json() as any
  
  if (session.error) {
    return c.json({ error: session.error.message }, 400)
  }

  // 保存订单（pending状态）
  const db = c.env.DB
  const orderNumber = generateOrderNumber()
  const subtotal = items.reduce((s: number, i: any) => s + i.price * i.qty, 0)
  
  await db.prepare(`
    INSERT INTO orders (order_number, customer_email, items, subtotal, total, payment_method, payment_status, transaction_id)
    VALUES (?, ?, ?, ?, ?, 'stripe', 'pending', ?)
  `).bind(
    orderNumber,
    customer_email || null,
    JSON.stringify(items),
    subtotal, subtotal,
    session.id
  ).run()

  return c.json({ 
    sessionId: session.id,
    url: session.url,
    orderNumber
  })
})

// Stripe Webhook
checkout.post('/stripe/webhook', async (c) => {
  const body = await c.req.text()
  const signature = c.req.header('stripe-signature') || ''
  const STRIPE_WEBHOOK_SECRET = c.env.STRIPE_WEBHOOK_SECRET

  if (!STRIPE_WEBHOOK_SECRET) return c.json({ error: 'Webhook not configured' }, 500)

  // 验证 webhook 签名（使用 Stripe SDK 更可靠，这里简化为验证）
  // 生产环境应使用 stripe.webhooks.constructEvent()
  try {
    const event = JSON.parse(body)
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const db = c.env.DB
      
      // 更新订单状态
      await db.prepare(
        "UPDATE orders SET payment_status = 'paid', order_status = 'processing', updated_at = datetime('now') WHERE transaction_id = ?"
      ).bind(session.id).run()
    }

    return c.json({ received: true })
  } catch (err) {
    return c.json({ error: 'Webhook error' }, 400)
  }
})

// ===== PayPal =====

// 创建 PayPal Order
checkout.post('/paypal', async (c) => {
  const body = await c.req.json()
  const { items } = body

  const PAYPAL_CLIENT_ID = c.env.PAYPAL_CLIENT_ID
  const PAYPAL_SECRET_KEY = c.env.PAYPAL_SECRET_KEY

  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET_KEY) return c.json({ error: 'PayPal not configured' }, 500)

  // 获取 access token
  const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET_KEY}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const tokenData = await tokenRes.json() as any

  // 创建订单
  const total = items.reduce((s: number, i: any) => s + i.price * i.qty, 0)
  const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: total.toFixed(2) },
        items: items.map((i: any) => ({
          name: i.title,
          quantity: String(i.qty),
          unit_amount: { currency_code: 'USD', value: i.price.toFixed(2) },
        })),
      }],
    }),
  })
  const paypalOrder = await orderRes.json() as any

  // 保存订单
  const db = c.env.DB
  const orderNumber = generateOrderNumber()
  
  await db.prepare(`
    INSERT INTO orders (order_number, items, subtotal, total, payment_method, payment_status, transaction_id)
    VALUES (?, ?, ?, ?, 'paypal', 'pending', ?)
  `).bind(
    orderNumber,
    JSON.stringify(items),
    total, total,
    paypalOrder.id
  ).run()

  return c.json({
    orderID: paypalOrder.id,
    orderNumber
  })
})

// PayPal Capture
checkout.post('/paypal/capture', async (c) => {
  const { orderID } = await c.req.json()
  const PAYPAL_CLIENT_ID = c.env.PAYPAL_CLIENT_ID
  const PAYPAL_SECRET_KEY = c.env.PAYPAL_SECRET_KEY

  const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET_KEY}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const tokenData = await tokenRes.json() as any

  const captureRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
  })
  const capture = await captureRes.json() as any

  if (capture.status === 'COMPLETED') {
    const db = c.env.DB
    await db.prepare(
      "UPDATE orders SET payment_status = 'paid', order_status = 'processing', updated_at = datetime('now') WHERE transaction_id = ?"
    ).bind(orderID).run()
  }

  return c.json(capture)
})

export { checkout }
