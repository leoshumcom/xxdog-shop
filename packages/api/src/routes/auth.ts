// 认证路由
import { Hono } from 'hono'
import type { Env } from '../index'
import { sign, verify } from 'hono/jwt'

const auth = new Hono<{ Bindings: Env }>()

// 管理员登录
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json()
  const db = c.env.DB
  
  const user = await db.prepare('SELECT id, email, name, password_hash, role FROM users WHERE email = ? AND is_active = 1').bind(email).first() as any
  if (!user) return c.json({ error: 'Invalid credentials' }, 401)

  // 用 bcryptjs 验证密码（需在Workers上可运行）
  // 注意：bcryptjs 在Workers环境可能需要调整
  const bcrypt = require('bcryptjs')
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401)

  // 更新最后登录时间
  await db.prepare('UPDATE users SET last_login_at = datetime("now") WHERE id = ?').bind(user.id).run()

  // 生成 JWT
  const token = await sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    c.env.JWT_SECRET
  )

  return c.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  })
})

// 验证Token
auth.get('/verify', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'No token' }, 401)

  try {
    const token = authHeader.slice(7)
    const payload = await verify(token, c.env.JWT_SECRET)
    return c.json({ valid: true, user: payload })
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

// 首次注册（仅首次使用，后续通过后台管理）
auth.post('/setup', async (c) => {
  const { email, password, name } = await c.req.json()
  const db = c.env.DB

  // 检查是否已有管理员
  const existing = await db.prepare('SELECT id FROM users LIMIT 1').first()
  if (existing) return c.json({ error: 'Setup already completed' }, 400)

  const bcrypt = require('bcryptjs')
  const hash = await bcrypt.hash(password, 10)
  
  await db.prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)')
    .bind(email, name, hash, 'superadmin').run()

  return c.json({ message: 'Admin created successfully' })
})

// 获取当前用户信息
auth.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'No token' }, 401)

  try {
    const token = authHeader.slice(7)
    const payload = await verify(token, c.env.JWT_SECRET) as any
    const db = c.env.DB
    const user = await db.prepare('SELECT id, email, name, role, avatar_url, created_at FROM users WHERE id = ?').bind(payload.sub).first()
    if (!user) return c.json({ error: 'User not found' }, 404)
    return c.json(user)
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

export { auth }
