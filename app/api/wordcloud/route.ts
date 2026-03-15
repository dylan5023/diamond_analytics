import { NextResponse } from 'next/server'
import { mockWordFrequencies } from '@/lib/mock-data'

const USE_MOCK = !process.env.KV_REST_API_URL

export async function GET() {
  if (USE_MOCK) {
    return NextResponse.json(mockWordFrequencies)
  }

  const { kv } = await import('@vercel/kv')
  const cached = await kv.get('wordcloud_data')
  if (!cached) return NextResponse.json({ error: 'No data yet' }, { status: 503 })
  return NextResponse.json(cached)
}

export async function POST(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { kv } = await import('@vercel/kv')
  const wordFrequencies = await request.json()
  await kv.set('wordcloud_data', JSON.stringify(wordFrequencies), { ex: 604800 })
  return NextResponse.json({ ok: true })
}
