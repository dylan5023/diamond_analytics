import { NextResponse } from 'next/server'
import { getPublishedBlogPosts, getBlogPostBySlug, getAvailableMonths } from '@/lib/notion'

export const revalidate = 3600

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const month = searchParams.get('month')
  const months = searchParams.get('months')

  if (slug) {
    const post = await getBlogPostBySlug(slug)
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(post)
  }

  if (months !== null) {
    const available = await getAvailableMonths()
    return NextResponse.json(available)
  }

  const posts = await getPublishedBlogPosts({ month: month ?? undefined, includeContent: false })
  return NextResponse.json(posts)
}
