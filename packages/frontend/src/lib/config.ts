---
// API 基础 URL
export const API_BASE = import.meta.env.DEV ? 'http://localhost:8787/api' : 'https://api.xxdog.com/api'

export const SITE = {
  name: 'XXDOG',
  tagline: 'Your Premium Fashion Destination',
  url: 'https://xxdog.com',
  description: 'Premium shoes, hats, clothing and accessories. Free shipping over $50.',
  email: 'hello@xxdog.com',
  currency: 'USD',
  currencySymbol: '$',
  shipping: {
    standard: 5.99,
    express: 15.99,
    freeThreshold: 50,
  },
  social: {
    instagram: '#',
    pinterest: '#',
    facebook: '#',
    twitter: '#',
  }
}
