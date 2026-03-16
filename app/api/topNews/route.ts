import { NextResponse } from 'next/server'
import { mockNewsArticles } from '@/lib/mock-data'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const USE_KV = !!process.env.KV_REST_API_URL
const LOCAL_CACHE_PATH = join(process.cwd(), 'data', 'top-news.json')

function getLocalCache() {
  if (!existsSync(LOCAL_CACHE_PATH)) return null
  try {
    return JSON.parse(readFileSync(LOCAL_CACHE_PATH, 'utf-8'))
  } catch {
    return null
  }
}

function setLocalCache(data: unknown) {
  writeFileSync(LOCAL_CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

export async function GET() {
  if (USE_KV) {
    const { kv } = await import('@vercel/kv')
    const cached = await kv.get('top_news_cache')
    if (!cached) return NextResponse.json({ error: 'No data yet' }, { status: 503 })
    return NextResponse.json(cached)
  }

  const localData = getLocalCache()
  if (localData) return NextResponse.json(localData)

  return NextResponse.json(mockNewsArticles)
}

export async function POST(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  let articles: unknown[]
  if (Array.isArray(body) && body.length === 1 && Array.isArray(body[0]?.data)) {
    articles = body[0].data
  } else if (Array.isArray(body)) {
    articles = body
  } else if (body?.data && Array.isArray(body.data)) {
    articles = body.data
  } else {
    articles = [body]
  }

  if (USE_KV) {
    const { kv } = await import('@vercel/kv')
    await kv.set('top_news_cache', JSON.stringify(articles), { ex: 21600 })
  } else {
    setLocalCache(articles)
  }

  return NextResponse.json({ ok: true, count: articles.length })
}
