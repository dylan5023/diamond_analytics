import type { BlogPost } from '@/types'
import { mockBlogPosts } from './mock-data'

const USE_MOCK = !process.env.NOTION_API_KEY

const NOTION_API = 'https://api.notion.com/v1'

async function notionFetch(path: string, body?: Record<string, unknown>) {
  const res = await fetch(`${NOTION_API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`Notion API error: ${error.message}`)
  }

  return res.json()
}

function parseGoogleSheetUrl(url: string): { spreadsheetId: string; range: string } | null {
  if (!url.includes('docs.google.com/spreadsheets')) return null

  const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (!idMatch) return null

  const rangeMatch = url.match(/range=([A-Za-z]+\d+)/i)
  const range = rangeMatch?.[1] ?? 'A2'

  return { spreadsheetId: idMatch[1], range }
}

async function fetchSheetContent(url: string): Promise<string> {
  const parsed = parseGoogleSheetUrl(url)
  if (!parsed) return url

  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${parsed.spreadsheetId}/gviz/tq?tqx=out:csv&range=${parsed.range}`
    const res = await fetch(csvUrl)
    if (!res.ok) return ''

    let text = await res.text()
    text = text.trim()
    if (text.startsWith('"') && text.endsWith('"')) {
      text = text.slice(1, -1).replace(/""/g, '"')
    }
    return text
  } catch {
    return ''
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPropertyValue(prop: any): string {
  if (!prop) return ''
  switch (prop.type) {
    case 'rich_text':
      return prop.rich_text?.map((t: { plain_text: string }) => t.plain_text).join('') ?? ''
    case 'url':
      return prop.url ?? ''
    case 'title':
      return prop.title?.[0]?.plain_text ?? ''
    case 'select':
      return prop.select?.name ?? ''
    case 'date':
      return prop.date?.start ?? ''
    case 'checkbox':
      return String(prop.checkbox ?? false)
    default:
      return ''
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageUrl(prop: any): string {
  if (!prop) return ''

  if (prop.type === 'files') {
    const files = prop.files ?? []
    if (files.length > 0) {
      const file = files[0]
      return file.external?.url ?? file.file?.url ?? ''
    }
  }

  if (prop.type === 'rich_text') {
    const text = prop.rich_text?.map((t: { plain_text: string }) => t.plain_text).join('') ?? ''
    if (text.startsWith('http')) return text
  }

  if (prop.type === 'url') {
    return prop.url ?? ''
  }

  return ''
}

/** Notion page.cover → 썸네일 URL 추출 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCoverUrl(cover: any): string {
  if (!cover) return ''
  if (cover.type === 'external') return cover.external?.url ?? ''
  if (cover.type === 'file') return cover.file?.url ?? ''
  return ''
}

/** YYYY-MM → { on_or_after, before } date range */
function monthToDateRange(month: string): { start: string; end: string } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null
  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  return { start, end: nextMonth }
}

export async function getAvailableMonths(): Promise<string[]> {
  if (USE_MOCK) {
    return [...new Set(mockBlogPosts.map(p => p.publishedAt.slice(0, 7)))].sort().reverse()
  }

  const response = await notionFetch(
    `/databases/${process.env.NOTION_BLOG_DATABASE_ID}/query`,
    {
      filter: { property: 'Published', checkbox: { equals: true } },
      sorts: [{ property: 'Published Date', direction: 'descending' }],
    }
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const months = response.results.map((page: any) => {
    const date: string = page.properties['Published Date']?.date?.start ?? ''
    return date.slice(0, 7)
  }).filter(Boolean) as string[]

  return [...new Set(months)].sort().reverse()
}

export async function getPublishedBlogPosts(options?: {
  month?: string
  includeContent?: boolean
}): Promise<BlogPost[]> {
  const includeContent = options?.includeContent ?? false

  if (USE_MOCK) {
    const posts = options?.month
      ? mockBlogPosts.filter(p => p.publishedAt.startsWith(options.month!))
      : mockBlogPosts
    return posts.map(p => ({ ...p, contents: includeContent ? p.contents : '' }))
  }

  const filters: unknown[] = [
    { property: 'Published', checkbox: { equals: true } },
  ]

  if (options?.month) {
    const range = monthToDateRange(options.month)
    if (range) {
      filters.push({ property: 'Published Date', date: { on_or_after: range.start } })
      filters.push({ property: 'Published Date', date: { before: range.end } })
    }
  }

  const response = await notionFetch(
    `/databases/${process.env.NOTION_BLOG_DATABASE_ID}/query`,
    {
      filter: filters.length === 1 ? filters[0] : { and: filters },
      sorts: [{ property: 'Published Date', direction: 'descending' }],
    }
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts = await Promise.all(response.results.map(async (page: any) => {
    const props = page.properties

    const rawImageUrl =
      extractImageUrl(props['Files']) ||   // Files 프로퍼티 우선
      extractCoverUrl(page.cover)          // 없으면 페이지 커버 이미지
    const imageUrl = rawImageUrl.replace(/^http:\/\//, 'https://')

    let contents = ''
    if (includeContent) {
      const contentUrl = extractPropertyValue(props['Content'])
      if (contentUrl && contentUrl.includes('docs.google.com')) {
        contents = await fetchSheetContent(contentUrl)
      } else {
        contents = contentUrl
      }
    }

    return {
      id: page.id,
      title: extractPropertyValue(props['Name']),
      slug: extractPropertyValue(props['Slug']),
      summary: extractPropertyValue(props['Summary']),
      contents,
      category: extractPropertyValue(props['Category']),
      imageUrl,
      publishedAt: extractPropertyValue(props['Published Date']),
      published: props['Published']?.checkbox ?? false,
    }
  }))

  return posts
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  if (USE_MOCK) return mockBlogPosts.find(p => p.slug === slug) ?? null

  const posts = await getPublishedBlogPosts({ includeContent: true })
  return posts.find(p => p.slug === slug) ?? null
}
