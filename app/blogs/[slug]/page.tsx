'use client'

import { use } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import Image from 'next/image'
import type { BlogPost } from '@/types'
import { fetcher, formatDate } from '@/lib/utils'
import { FadeIn } from '@/components/MotionWrapper'

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { data: post, error, isLoading } = useSWR<BlogPost>(
    `/api/blogs?slug=${slug}`,
    fetcher
  )

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-32 rounded bg-surface" />
          <div className="h-10 w-3/4 rounded bg-surface" />
          <div className="h-4 w-full rounded bg-surface" />
          <div className="space-y-3">
            {[95, 88, 78, 92, 70, 85, 97, 75].map((w, i) => (
              <div key={i} className="h-4 rounded bg-surface" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="glass-card p-12 text-center">
          <h2 className="font-heading text-2xl font-bold">Post Not Found</h2>
          <p className="mt-2 text-text-secondary">The blog post you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/blogs" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
            Back to Blog
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <FadeIn>
        <Link href="/blogs" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-accent">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          Back to Blog
        </Link>

        <article>
          <header className="mb-10">
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <time>{formatDate(post.publishedAt)}</time>
              {post.category && (
                <>
                  <span className="text-border">|</span>
                  <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    {post.category}
                  </span>
                </>
              )}
            </div>
            <h1 className="mt-4 font-heading text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
              {post.title}
            </h1>
            <p className="mt-4 text-lg text-text-secondary">{post.summary}</p>
          </header>

          {post.imageUrl && (
            <div className="relative mb-10 aspect-video overflow-hidden rounded-2xl border border-border">
              <Image
                src={post.imageUrl}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
            </div>
          )}

          <div className="prose-custom text-text-secondary leading-relaxed [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-text-primary [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:font-heading [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-text-primary [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:font-heading [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-text-primary [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:ml-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_li]:text-text-secondary [&_strong]:text-text-primary [&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text-muted">
            {post.contents.split('\n').map((line, i) => {
              const trimmed = line.trim()
              if (!trimmed) return <br key={i} />
              if (trimmed.startsWith('## ')) return <h2 key={i}>{trimmed.slice(3)}</h2>
              if (trimmed.startsWith('### ')) return <h3 key={i}>{trimmed.slice(4)}</h3>
              if (trimmed.startsWith('#### ')) return <h4 key={i}>{trimmed.slice(5)}</h4>
              if (trimmed.startsWith('> ')) return <blockquote key={i}><p>{trimmed.slice(2)}</p></blockquote>
              if (trimmed.startsWith('- **')) {
                const match = trimmed.match(/^- \*\*(.+?)\*\*\s*[-—]\s*(.+)$/)
                if (match) return <li key={i}><strong>{match[1]}</strong> — {match[2]}</li>
                return <li key={i}>{trimmed.slice(2)}</li>
              }
              if (trimmed.startsWith('- ')) return <li key={i}>{trimmed.slice(2)}</li>
              return <p key={i}>{trimmed.split('**').map((part, j) =>
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              )}</p>
            })}
          </div>
        </article>
      </FadeIn>
    </div>
  )
}
