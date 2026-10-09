import { NextResponse } from 'next/server'

const SHEET_ID = '15h9482iB3qVS-AKXqgHyLB5eO29MzKv3bX0pHPXiYKY'
const USE_KV = !!process.env.KV_REST_API_URL
const TOP_N = 10

// Google Sheet 헤더 순서 (0-indexed)
const COL = {
  title: 0,
  rank: 1,
  url: 2,
  store_time: 3,
  status: 4,
  image_thumbnail: 5,
  contents: 6,
  summary: 7,
  info_density_reasoning: 8,
  info_density: 9,
  trend_reasoning: 10,
  trend_score: 11,
  utility_reasoning: 12,
  utility_score: 13,
  total_score: 14,
} as const

type GvizCell = { v?: unknown; f?: string } | null

/** gviz 셀에서 문자열 값 추출 */
function cellStr(cell: GvizCell): string {
  if (!cell) return ''
  // Date(2026,2,18,...) 형식 처리 (gviz는 month 0-indexed)
  if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
    const m = cell.v.match(/^Date\((\d+),(\d+),(\d+)/)
    if (m) {
      return `${m[1]}-${String(Number(m[2]) + 1).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
    }
  }
  if (cell.v != null) return String(cell.v)
  if (cell.f != null) return cell.f
  return ''
}

/**
 * ESPN 스크래퍼 형식 변환: "anchor text[url]" → HTML 링크
 * 예) "Eugenio Suárez[https://espn.com/...]" → <a href="...">Eugenio Suárez</a>
 */
function convertContentsToHtml(raw: string): string {
  if (!raw) return ''

  // 유니코드 포함 단어 문자 (Suárez, Arráez 등 처리)
  const wordChar = '[\\w\\u00C0-\\u024F\'\'\\-.]'
  // "이름[url]" 또는 "이름 [url]" → <a href>이름</a>  (space 0~1개 허용)
  const namedLink = new RegExp(
    `((?:${wordChar}+\\s+){0,3}${wordChar}+)\\s?\\[((https?:\\/\\/|\\/)[^\\]\\n]+)\\]`,
    'g',
  )

  let html = raw
    .replace(namedLink, (_, anchor, url) => {
      const href = url.startsWith('/') ? `https://www.espn.com${url}` : url
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-accent underline underline-offset-2">${anchor.trim()}</a>`
    })
    // 앞에 앵커 없이 남은 [url]
    .replace(/\[((https?:\/\/|\/)[^\]\n]+)\]/g, (_, url) => {
      const href = url.startsWith('/') ? `https://www.espn.com${url}` : url
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-accent">↗</a>`
    })

  // 빈 줄 기준으로 단락 나누기
  html = html
    .split(/\n\n+/)
    .map(p => `<p>${p.trim().replace(/\n/g, ' ')}</p>`)
    .filter(p => p !== '<p></p>')
    .join('\n')

  return html
}

/** gviz JSONP 응답 → 파싱 */
function parseGviz(text: string): GvizCell[][] {
  // JSONP wrapper 제거: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const json = text
    .replace(/^\/\*[\s\S]*?\*\/\s*/m, '')
    .replace(/^google\.visualization\.Query\.setResponse\(/, '')
    .replace(/\);\s*$/, '')

  const data = JSON.parse(json)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data?.table?.rows ?? []).map((row: any) => row?.c ?? [])
}

/** store_time 문자열 → YYYY-MM-DD 추출 */
function toDate(raw: string): string {
  // "2026-03-18 21:11" or "2026-03-18T21:11" or "2026-03-18"
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : ''
}

function rankArticles(
  articles: Record<string, unknown>[],
): Record<string, unknown>[] {
  return [...articles]
    .sort((a, b) => (b.total_score as number) - (a.total_score as number))
    .slice(0, TOP_N)
    .map((a, i) => ({ ...a, rank: i + 1 }))
}

/**
 * POST /api/topNews/import-sheets
 *
 * Google Sheets에 저장된 뉴스 데이터를 KV로 복구합니다.
 * Authorization: Bearer <N8N_WEBHOOK_SECRET>
 *
 * Optional body: { "date_filter": "2026-09" }  특정 월만 import
 */
export async function POST(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!USE_KV) {
    return NextResponse.json({ error: 'KV not configured' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const dateFilter: string | null = body.date_filter ?? null // e.g. "2026-09"

  // 1. Google Sheets에서 gviz JSON으로 fetch
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`
  const res = await fetch(sheetUrl, { cache: 'no-store' })
  if (!res.ok) {
    return NextResponse.json({ error: `Sheet fetch failed: ${res.status}` }, { status: 502 })
  }

  const text = await res.text()
  let rows: GvizCell[][]
  try {
    rows = parseGviz(text)
  } catch (e) {
    return NextResponse.json({ error: `Parse error: ${String(e)}` }, { status: 500 })
  }

  // 2. 행 → NewsArticle 변환 (헤더 행 자동 스킵)
  const byDate = new Map<string, Record<string, unknown>[]>()

  for (const row of rows) {
    const title = cellStr(row[COL.title])
    const url = cellStr(row[COL.url])
    const storeTime = cellStr(row[COL.store_time])

    if (!title || title === 'title') continue // 헤더 행 스킵
    if (!url) continue

    const date = toDate(storeTime)
    if (!date) continue
    if (dateFilter && !date.startsWith(dateFilter)) continue

    const article: Record<string, unknown> = {
      title,
      url,
      date,
      html: convertContentsToHtml(cellStr(row[COL.contents])),
      image_thumbnail: cellStr(row[COL.image_thumbnail]),
      category: 'MLB',
      information_density: Number(cellStr(row[COL.info_density])) || 0,
      information_density_reasoning: cellStr(row[COL.info_density_reasoning]),
      trend_score: Number(cellStr(row[COL.trend_score])) || 0,
      trend_reasoning: cellStr(row[COL.trend_reasoning]),
      utility_score: Number(cellStr(row[COL.utility_score])) || 0,
      utility_reasoning: cellStr(row[COL.utility_reasoning]),
      total_score: Number(cellStr(row[COL.total_score])) || 0,
      rank: 0,
    }

    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(article)
  }

  if (byDate.size === 0) {
    return NextResponse.json({ error: 'No articles parsed (check date_filter or sheet visibility)' }, { status: 404 })
  }

  // 3. KV에 날짜별로 저장 (90일 TTL)
  const { kv } = await import('@vercel/kv')
  const savedDates: string[] = []
  const summary: Record<string, number> = {}

  for (const [date, articles] of byDate) {
    const ranked = rankArticles(articles)
    await kv.set(`top_news_${date}`, ranked, { ex: 60 * 60 * 24 * 90 })
    savedDates.push(date)
    summary[date] = articles.length
  }

  const allDates = savedDates.sort().reverse()
  await kv.set('top_news_dates', allDates)
  await kv.set('top_news_latest_date', allDates[0])

  return NextResponse.json({
    ok: true,
    total_articles: Object.values(summary).reduce((a, b) => a + b, 0),
    dates_imported: allDates,
    articles_per_date: summary,
  })
}
