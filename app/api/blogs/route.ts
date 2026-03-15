import { NextResponse } from 'next/server'
import { getPublishedBlogPosts, getBlogPostBySlug } from '@/lib/notion'

export const revalidate = 3600

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (slug) {
    const post = await getBlogPostBySlug(slug)
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(post)
  }

  const posts = await getPublishedBlogPosts()
  return NextResponse.json(posts)
}
