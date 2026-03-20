import { NextResponse } from 'next/server'
import { articleToVancouverBucket } from '@/lib/top-news-article-date'

const USE_KV = !!process.env.KV_REST_API_URL
const TOP_N = 10
const KV_EX = 60 * 60 * 24 * 30

function articleKey(a: Record<string, unknown>): string | null {
  const u = (a.url as string) || ''
  const t = (a.title as string) || ''
  return u || t || null
}

function score(a: Record<string, unknown>): number {
  const n = a.total_score
  return typeof n === 'number' && !Number.isNaN(n) ? n : 0
}

/** Dedupe by url/title, keep highest total_score (no TOP_N cap). */
function dedupeArticles(
  tagged: { article: Record<string, unknown>; sourceKey: string }[],
): { article: Record<string, unknown>; sourceKey: string }[] {
  const map = new Map<
    string,
    { article: Record<string, unknown>; sourceKey: string }
  >()
  for (const row of tagged) {
    const k = articleKey(row.article)
    if (!k) continue
    const prev = map.get(k)
    if (!prev || score(row.article) >= score(prev.article)) {
      map.set(k, row)
    }
  }
  return [...map.values()]
}

function rankTopN(articles: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...articles]
    .sort((a, b) => score(b) - score(a))
    .slice(0, TOP_N)
    .map((a, i) => ({ ...a, rank: i + 1 }))
}

/**
 * POST /api/topNews/rebucket
 *
 * Re-splits KV top news into per-day keys using each article's `date` field
 * (Vancouver bucket rules in `articleToVancouverBucket`), then TOP_N per day.
 *
 * Body (optional):
 * - `dry_run`: true → only return the planned bucket counts (no KV writes)
 *
 * Auth: Bearer N8N_WEBHOOK_SECRET (same as other topNews admin routes)
 */
export async function POST(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!USE_KV) {
    return NextResponse.json({ error: 'Rebucket only supported with KV' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const dryRun = body.dry_run === true

  const { kv } = await import('@vercel/kv')
  const existingDates = (await kv.get<string[]>('top_news_dates')) ?? []

  if (existingDates.length === 0) {
    return NextResponse.json({ error: 'No top_news_dates in KV' }, { status: 404 })
  }

  const tagged: { article: Record<string, unknown>; sourceKey: string }[] = []
  for (const date of existingDates) {
    const articles = (await kv.get<Record<string, unknown>[]>(`top_news_${date}`)) ?? []
    for (const article of articles) {
      tagged.push({ article, sourceKey: date })
    }
  }

  const unique = dedupeArticles(tagged)

  if (unique.length === 0) {
    return NextResponse.json({ error: 'No articles found in KV date keys' }, { status: 404 })
  }

  const warnings: { url?: string; title?: string; used_fallback_key: string }[] = []
  const bucketToArticles = new Map<string, Record<string, unknown>[]>()

  for (const { article, sourceKey } of unique) {
    if (typeof article.date !== 'string' || !article.date.trim()) {
      warnings.push({
        url: article.url as string | undefined,
        title: article.title as string | undefined,
        used_fallback_key: sourceKey,
      })
    }
    const bucket = articleToVancouverBucket(article, sourceKey)
    if (!bucketToArticles.has(bucket)) bucketToArticles.set(bucket, [])
    bucketToArticles.get(bucket)!.push(article)
  }

  const rankedByDate = new Map<string, Record<string, unknown>[]>()
  for (const [d, list] of bucketToArticles) {
    const ranked = rankTopN(list)
    if (ranked.length > 0) rankedByDate.set(d, ranked)
  }

  const newDates = [...rankedByDate.keys()].sort().reverse()
  const bucketCounts: Record<string, number> = {}
  const bucketRankedCounts: Record<string, number> = {}
  for (const [d, list] of bucketToArticles) {
    bucketCounts[d] = list.length
    const ranked = rankedByDate.get(d)
    bucketRankedCounts[d] = ranked ? ranked.length : 0
  }

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      old_dates: existingDates,
      new_dates: newDates,
      bucket_raw_counts: bucketCounts,
      bucket_after_top_n: bucketRankedCounts,
      unique_articles: unique.length,
      warnings: warnings.slice(0, 50),
      warning_truncated: warnings.length > 50,
    })
  }

  if (newDates.length === 0) {
    return NextResponse.json(
      { error: 'Rebucket produced no non-empty days (unexpected)' },
      { status: 500 },
    )
  }

  for (const date of existingDates) {
    await kv.del(`top_news_${date}`)
  }

  for (const [date, list] of rankedByDate) {
    await kv.set(`top_news_${date}`, list, { ex: KV_EX })
  }

  await kv.set('top_news_dates', newDates)
  await kv.set('top_news_latest_date', newDates[0])

  return NextResponse.json({
    ok: true,
    dry_run: false,
    old_dates: existingDates,
    new_dates: newDates,
    bucket_raw_counts: bucketCounts,
    written_articles_per_day: Object.fromEntries(
      [...rankedByDate].map(([d, a]) => [d, a.length]),
    ),
    unique_articles: unique.length,
    warnings: warnings.slice(0, 50),
    warning_truncated: warnings.length > 50,
  })
}
