'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { BlogPost } from '@/types'
import { formatDate } from '@/lib/utils'

interface Props {
  post: BlogPost
  index: number
}

export default function BlogCard({ post, index }: Props) {
  const colors = ['#c9a84c', '#a88a3a', '#e2c97e', '#8b7332', '#d4b85c', '#b89840']
  const color = colors[index % colors.length]

  return (
    <Link href={`/blogs/${post.slug}`} className="group block">
      <article className="glass-card flex h-full flex-col overflow-hidden transition-all group-hover:border-accent/30 group-hover:shadow-lg group-hover:shadow-accent/5">
        <div
          className="relative h-40 overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` }}
        >
          {post.imageUrl ? (
            <Image
              src={post.imageUrl}
              alt={post.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-30 transition-transform group-hover:scale-110">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                <path d="M8 7h6" />
                <path d="M8 11h8" />
              </svg>
            </div>
          )}
          {post.category && (
            <div className="absolute bottom-3 left-4 flex items-center gap-2">
              <span className="rounded-md bg-navy/60 px-2 py-1 text-[10px] font-medium text-text-secondary backdrop-blur-sm">
                {post.category}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <time className="text-xs font-medium text-text-muted">
            {formatDate(post.publishedAt)}
          </time>
          <h3 className="mt-2 font-heading text-lg font-bold leading-snug transition-colors group-hover:text-accent">
            {post.title}
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary line-clamp-3">
            {post.summary}
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-accent">
            Read more
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
        </div>
      </article>
    </Link>
  )
}
