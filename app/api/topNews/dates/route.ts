import { NextResponse } from 'next/server'
import { readdirSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const USE_KV = !!process.env.KV_REST_API_URL
const NEWS_DIR = join(process.cwd(), 'data', 'top-news')

export async function GET() {
  const MAX_DAYS = 5

  if (USE_KV) {
    const { kv } = await import('@vercel/kv')
    const dates = (await kv.get<string[]>('top_news_dates')) ?? []
    return NextResponse.json(dates.slice(0, MAX_DAYS))
  }

  if (!existsSync(NEWS_DIR)) {
    mkdirSync(NEWS_DIR, { recursive: true })
    return NextResponse.json([])
  }

  const dates = readdirSync(NEWS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort()
    .reverse()

  return NextResponse.json(dates.slice(0, MAX_DAYS))
}
