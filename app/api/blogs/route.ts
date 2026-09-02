import { NextResponse } from 'next/server'
import { getPublishedBlogPosts, getBlogPostBySlug, getAvailableMonths } from '@/lib/notion'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const month = searchParams.get('month')
  const months = searchParams.get('months')

  if (slug) {
    const post = await getBlogPostBySlug(slug)
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(post, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  }

  if (months !== null) {
    const available = await getAvailableMonths()
    return NextResponse.json(available, {
      // 월 목록은 짧게 캐시 — 새 달이 생겨도 10분 내 반영
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
    })
  }

  const posts = await getPublishedBlogPosts({ month: month ?? undefined, includeContent: false })
  return NextResponse.json(posts, {
    // Notion 내부 파일 URL은 ~1시간 후 만료 → 45분 캐시
    headers: { 'Cache-Control': 'public, s-maxage=2700, stale-while-revalidate=3600' },
  })
}
