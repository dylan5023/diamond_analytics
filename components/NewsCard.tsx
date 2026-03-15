'use client'

import type { NewsArticle } from '@/types'
import { formatDate } from '@/lib/utils'

interface Props {
  article: NewsArticle
}

export default function NewsCard({ article }: Props) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <article className="glass-card flex h-full flex-col overflow-hidden transition-all group-hover:border-accent/30 group-hover:shadow-lg group-hover:shadow-accent/5">
        <div className="relative h-44 overflow-hidden bg-navy-card">
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/10 to-transparent">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-accent/30">
              <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
              <path d="M18 14h-8" />
              <path d="M15 18h-5" />
              <rect x="10" y="6" width="8" height="4" rx="1" />
            </svg>
          </div>
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-breaking/20 px-2 py-1 text-[10px] font-semibold text-breaking backdrop-blur-sm">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-breaking" />
              NEWS
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <time className="text-xs font-medium text-text-muted">
            {formatDate(article.publishedAt)}
          </time>
          <h3 className="mt-2 font-heading text-lg font-bold leading-snug transition-colors group-hover:text-accent">
            {article.title}
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary line-clamp-3">
            {article.summary}
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-accent">
            Read full article
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </div>
        </div>
      </article>
    </a>
  )
}
