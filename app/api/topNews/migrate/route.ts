import { NextResponse } from 'next/server'

const USE_KV = !!process.env.KV_REST_API_URL
const TOP_N = 10

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

/**
 * POST /api/topNews/migrate
 *
 * Consolidates all existing KV date entries into a single target date.
 * Body: { "target_date": "2026-03-17" }  (optional, defaults to today)
 *
 * This fixes data that was scattered across article publication dates
 * by the old code. After migration, all articles are merged and ranked
 * under the target date.
 */
export async function POST(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!USE_KV) {
    return NextResponse.json({ error: 'Migration only supported with KV' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const targetDate = (body.target_date as string) || new Date().toISOString().slice(0, 10)

  const { kv } = await import('@vercel/kv')
  const existingDates = (await kv.get<string[]>('top_news_dates')) ?? []

  if (existingDates.length === 0) {
    return NextResponse.json({ error: 'No existing dates to migrate' }, { status: 404 })
  }

  let allArticles: Record<string, unknown>[] = []
  const migratedFrom: string[] = []

  for (const date of existingDates) {
    const articles = await kv.get<Record<string, unknown>[]>(`top_news_${date}`)
    if (articles && articles.length > 0) {
      allArticles = mergeAndRank(allArticles, articles)
      migratedFrom.push(`${date} (${articles.length} articles)`)
    }
  }

  if (allArticles.length === 0) {
    return NextResponse.json({ error: 'No articles found across any dates' }, { status: 404 })
  }

  await kv.set(`top_news_${targetDate}`, allArticles, { ex: 60 * 60 * 24 * 30 })

  for (const date of existingDates) {
    if (date !== targetDate) {
      await kv.del(`top_news_${date}`)
    }
  }

  const newDates = [targetDate]
  await kv.set('top_news_dates', newDates)
  await kv.set('top_news_latest_date', targetDate)

  return NextResponse.json({
    ok: true,
    target_date: targetDate,
    migrated_articles: allArticles.length,
    migrated_from: migratedFrom,
    cleaned_dates: existingDates.filter(d => d !== targetDate),
  })
}
