// 图片上传路由
import { Hono } from 'hono'
import type { Env } from '../index'

const upload = new Hono<{ Bindings: Env }>()

// 上传图片到 R2
upload.post('/', async (c) => {
  const media = c.env.MEDIA
  const body = await c.req.parseBody()
  const file = body['file'] as File | null
  
  if (!file) return c.json({ error: 'No file provided' }, 400)

  // 生成路径
  const ext = file.name.split('.').pop() || 'jpg'
  const folder = (body['folder'] as string) || 'uploads'
  const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
  const key = `${folder}/${filename}`

  // 上传到 R2
  await media.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { originalName: file.name }
  })

  // 返回公开URL
  const url = `https://media.xxdog.com/${key}`
  // 如果有CF Images则用它，否则就用R2.dev域名（需要配置）
  // 实际生产用 Cloudflare Images 或自定义域

  return c.json({
    url: `https://pub-xxx.r2.dev/${key}`, // 需替换为实际的R2公开域名
    key,
    filename,
    size: file.size,
    type: file.type
  })
})

// 批量上传
upload.post('/multiple', async (c) => {
  const media = c.env.MEDIA
  const body = await c.req.parseBody()
  const files = body['files'] as File[] | null
  
  if (!files || files.length === 0) return c.json({ error: 'No files' }, 400)

  const urls = await Promise.all(
    (Array.isArray(files) ? files : [files]).map(async (file: File) => {
      const ext = file.name.split('.').pop() || 'jpg'
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
      const key = `products/${filename}`
      await media.put(key, file.stream(), {
        httpMetadata: { contentType: file.type }
      })
      return { url: key, name: file.name }
    })
  )

  return c.json({ files: urls })
})

export { upload }
