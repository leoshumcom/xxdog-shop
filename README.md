# 🐕 XXDOG - Fashion E-commerce Store

Zero-cost, fully serverless fashion e-commerce on Cloudflare.

## Architecture

```
Frontend: Astro + Tailwind → Cloudflare Pages
API: Hono Workers → Cloudflare Workers
Database: D1 (SQLite)
Storage: R2 (Images)
Cache: KV (Cart sessions)
```

## Quick Start

```bash
# Install deps
npm install
cd packages/api && npm install
cd ../frontend && npm install
cd ../..

# Create D1 database
npx wrangler d1 create xxdog-db

# Initialize database
npx wrangler d1 execute xxdog-db --file=./schema.sql
npx wrangler d1 execute xxdog-db --file=./seed.sql

# Dev
cd packages/api && npm run dev
cd packages/frontend && npm run dev

# Deploy
cd packages/api && npm run deploy
cd packages/frontend && npm run deploy
```

## Environment Variables (API Workers)

- `JWT_SECRET` - JWT signing key for admin auth
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `PAYPAL_CLIENT_ID` - PayPal client ID
- `PAYPAL_SECRET_KEY` - PayPal secret key

## DNS Setup

```
xxdog.com (A) → Cloudflare Pages IPs or CNAME
api.xxdog.com (CNAME) → xxdog-api.your-account.workers.dev
media.xxdog.com (CNAME) → R2 bucket custom domain
```

## First Run

1. Set DNS for xxdog.com to Cloudflare Pages
2. Deploy Workers and Pages
3. Visit /admin to set up admin account
4. Start adding products
