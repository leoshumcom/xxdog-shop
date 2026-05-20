// API 工具函数
import { API_BASE } from './config'

// 通用请求
export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'API Error')
  }
  return res.json()
}

// 产品
export const products = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/products${qs}`)
  },
  get: (slug: string) => apiFetch(`/products/${slug}`),
}

// 分类
export const categories = {
  list: () => apiFetch('/categories'),
  get: (slug: string) => apiFetch(`/categories/${slug}`),
}

// 购物车
export const cart = {
  get: (sessionId: string) => apiFetch(`/cart/${sessionId}`),
  update: (sessionId: string, items: any[]) =>
    apiFetch(`/cart/${sessionId}`, { method: 'PUT', body: JSON.stringify({ items }) }),
  clear: (sessionId: string) =>
    apiFetch(`/cart/${sessionId}`, { method: 'DELETE' }),
}

// 结算
export const checkout = {
  stripe: (data: any) => apiFetch('/checkout/stripe', { method: 'POST', body: JSON.stringify(data) }),
  paypal: (data: any) => apiFetch('/checkout/paypal', { method: 'POST', body: JSON.stringify(data) }),
  paypalCapture: (orderID: string) => apiFetch('/checkout/paypal/capture', { method: 'POST', body: JSON.stringify({ orderID }) }),
}

// 博客
export const blog = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/blog${qs}`)
  },
  get: (slug: string) => apiFetch(`/blog/${slug}`),
}

// 页面
export const pages = {
  get: (slug: string) => apiFetch(`/pages/${slug}`),
  settings: () => apiFetch('/pages/settings/list'),
}

// 图片URL辅助
export function imageUrl(key: string) {
  if (!key) return '/placeholder.svg'
  if (key.startsWith('http')) return key
  return `https://media.xxdog.com/${key}`
}

// 价格格式化
export function formatPrice(price: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price)
}

// 购物车 Session ID
export function getCartSessionId(): string {
  let id = localStorage.getItem('cart_session')
  if (!id) {
    id = 'cart_' + Math.random().toString(36).substring(2, 15)
    localStorage.setItem('cart_session', id)
  }
  return id
}
