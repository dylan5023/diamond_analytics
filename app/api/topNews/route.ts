import { NextResponse } from 'next/server'
import { mockNewsArticles } from '@/lib/mock-data'
import { topNewsCalendarDate } from '@/lib/top-news-calendar'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const USE_KV = !!process.env.KV_REST_API_URL
const NEWS_DIR = join(process.cwd(), 'data', 'top-news')
const LEGACY_CACHE_PATH = join(process.cwd(), 'data', 'top-news.json')

function ensureDir() {
  if (!existsSync(NEWS_DIR)) mkdirSync(NEWS_DIR, { recursive: true })
}

function dateFilePath(date: string) {
  return join(NEWS_DIR, `${date}.json`)
}

function getArticlesForDate(date: string) {
  const fp = dateFilePath(date)
  if (!existsSync(fp)) return null
  try {
    return JSON.parse(readFileSync(fp, 'utf-8'))
  } catch {
    return null
  }
}

function getLatestLocalDate(): string | null {
  ensureDir()
  const { readdirSync } = require('fs') as typeof import('fs')
  const files = readdirSync(NEWS_DIR)
    .filter((f: string) => f.endsWith('.json'))
    .map((f: string) => f.replace('.json', ''))
    .sort()
    .reverse()
  return files[0] ?? null
}

const TOP_N = 10

function rerank(articles: unknown): unknown {
  if (!Array.isArray(articles)) return articles
  return [...articles]
    .sort((a, b) => (b.total_score as number) - (a.total_score as number))
    .map((a, i) => ({ ...a, rank: i + 1 }))
}

function mergeAndRank(
  existing: Record<string, unknown>[],
  incoming: Record<string, unknown>[],
): Record<string, unknown>[] {
  const map = new Map<string, Record<string, unknown>>()
  for (const a of existing) {
    const key = (a.url as string) || (a.title as string)
    if (key) map.set(key, a)
  }
  for (const a of incoming) {
    const key = (a.url as string) || (a.title as string)
    if (key) {
      const prev = map.get(key)
      if (!prev || (a.total_score as number) >= (prev.total_score as number)) {
        map.set(key, a)
      }
    }
  }
  return [...map.values()]
    .sort((a, b) => (b.total_score as number) - (a.total_score as number))
    .slice(0, TOP_N)
    .map((a, i) => ({ ...a, rank: i + 1 }))
}

function saveArticles(articles: Record<string, unknown>[]) {
  ensureDir()
  const today = topNewsCalendarDate()
  const existing = getArticlesForDate(today) ?? []
  const merged = mergeAndRank(existing, articles)
  writeFileSync(dateFilePath(today), JSON.stringify(merged, null, 2), 'utf-8')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')

  if (USE_KV) {
    const { kv } = await import('@vercel/kv')
    if (dateParam) {
      const data = await kv.get(`top_news_${dateParam}`)
      if (!data) return NextResponse.json({ error: 'No data for this date' }, { status: 404 })
      return NextResponse.json(rerank(data))
    }
    const latest = await kv.get<string>('top_news_latest_date')
    if (!latest) {
      const cached = await kv.get('top_news_cache')
      if (cached) return NextResponse.json(rerank(cached))
      return NextResponse.json({ error: 'No data yet' }, { status: 503 })
    }
    const data = await kv.get(`top_news_${latest}`)
    return data
      ? NextResponse.json(rerank(data))
      : NextResponse.json({ error: 'No data yet' }, { status: 503 })
  }

  if (dateParam) {
    const data = getArticlesForDate(dateParam)
    if (data) return NextResponse.json(rerank(data))
    return NextResponse.json({ error: 'No data for this date' }, { status: 404 })
  }

  const latestDate = getLatestLocalDate()
  if (latestDate) {
    const data = getArticlesForDate(latestDate)
    if (data) return NextResponse.json(rerank(data))
  }

  if (existsSync(LEGACY_CACHE_PATH)) {
    try {
      const legacy = JSON.parse(readFileSync(LEGACY_CACHE_PATH, 'utf-8'))
      return NextResponse.json(rerank(legacy))
    } catch { /* ignore */ }
  }

  return NextResponse.json(rerank(mockNewsArticles))
}

export async function POST(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  let articles: Record<string, unknown>[]
  if (Array.isArray(body) && body.length === 1 && Array.isArray(body[0]?.data)) {
    articles = body[0].data
  } else if (Array.isArray(body)) {
    articles = body
  } else if (body?.data && Array.isArray(body.data)) {
    articles = body.data
  } else {
    articles = [body]
  }

  const today = topNewsCalendarDate()

  if (USE_KV) {
    const { kv } = await import('@vercel/kv')
    const existing = (await kv.get<Record<string, unknown>[]>(`top_news_${today}`)) ?? []
    const merged = mergeAndRank(existing, articles)
    await kv.set(`top_news_${today}`, merged, { ex: 60 * 60 * 24 * 30 })
    const existingDates = (await kv.get<string[]>('top_news_dates')) ?? []
    const allDates = [...new Set([...existingDates, today])].sort().reverse()
    await kv.set('top_news_dates', allDates)
    await kv.set('top_news_latest_date', allDates[0])
  } else {
    saveArticles(articles)
  }

  return NextResponse.json({ ok: true, count: articles.length })
}
