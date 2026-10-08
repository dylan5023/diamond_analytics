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
    if (dates.length === 0) return NextResponse.json([])

    // 실제 데이터가 남아있는 날짜만 반환 (만료된 KV 키 필터링)
    const validDates: string[] = []
    for (const d of dates) {
      if (validDates.length >= MAX_DAYS) break
      const exists = await kv.exists(`top_news_${d}`)
      if (exists) validDates.push(d)
    }

    // 만료된 날짜가 있으면 목록도 정리
    if (validDates.length !== dates.slice(0, MAX_DAYS).length) {
      await kv.set('top_news_dates', validDates)
    }

    return NextResponse.json(validDates)
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
