import { NextResponse } from 'next/server'
import { mockNewsArticles } from '@/lib/mock-data'

const USE_MOCK = !process.env.KV_REST_API_URL

export async function GET() {
  if (USE_MOCK) {
    return NextResponse.json(mockNewsArticles)
  }

  const { kv } = await import('@vercel/kv')
  const cached = await kv.get('top_news_cache')
  if (!cached) return NextResponse.json({ error: 'No data yet' }, { status: 503 })
  return NextResponse.json(cached)
}

export async function POST(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { kv } = await import('@vercel/kv')
  const articles = await request.json()
  await kv.set('top_news_cache', JSON.stringify(articles), { ex: 21600 })
  return NextResponse.json({ ok: true })
}
