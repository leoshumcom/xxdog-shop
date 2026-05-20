import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  output: 'server', // 需要 SSR 用于购物车等动态功能
  adapter: undefined, // Cloudflare Pages 用 wrangler 自动适配
  site: 'https://xxdog.com',
  vite: {
    ssr: {
      noExternal: ['@astrojs/tailwind']
    }
  }
});
