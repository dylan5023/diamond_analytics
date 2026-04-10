'use client'

import { sendGAEvent } from '@next/third-parties/google'
import type { NewsArticle } from '@/types'
import { formatDate } from '@/lib/utils'

interface Props {
  article: NewsArticle
  onClick?: () => void
  scoreRank?: number
}

const RANK_BORDER: Record<number, { border: string; shadow: string }> = {
  1: { border: 'rgba(250, 204, 21, 0.7)', shadow: '0 4px 20px rgba(250, 204, 21, 0.15)' },
  2: { border: 'rgba(203, 213, 225, 0.6)', shadow: '0 4px 20px rgba(203, 213, 225, 0.12)' },
  3: { border: 'rgba(217, 119, 6, 0.6)', shadow: '0 4px 20px rgba(217, 119, 6, 0.12)' },
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export default function NewsCard({ article, onClick, scoreRank }: Props) {
  const preview = stripHtml(article.html)
  const rankBorder = scoreRank ? RANK_BORDER[scoreRank] : undefined

  return (
    <button
      type="button"
      onClick={() => {
        sendGAEvent('event', 'news_click', { article_title: article.title, article_rank: article.rank })
        onClick?.()
      }}
      className="group block w-full text-left"
    >
      <article
        className="glass-card flex h-full flex-col overflow-hidden transition-all group-hover:shadow-lg group-hover:shadow-accent/5"
        style={rankBorder ? {
          borderColor: rankBorder.border,
          borderWidth: '1.5px',
          boxShadow: rankBorder.shadow,
        } : undefined}
      >
        <div className="relative h-44 overflow-hidden bg-navy-card">
          {article.image_thumbnail ? (
            <img
              src={article.image_thumbnail}
              alt={article.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-accent/20 via-navy-card to-navy-light">
              <svg width="64" height="64" viewBox="0 0 100 100" className="text-accent/25">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="3" />
                <path d="M50 10 C55 30, 70 40, 90 50 C70 60, 55 70, 50 90 C45 70, 30 60, 10 50 C30 40, 45 30, 50 10Z" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M30 20 C40 35, 40 65, 30 80" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d="M70 20 C60 35, 60 65, 70 80" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
              </svg>
            </div>
          )}

          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-black/60 px-2 py-0.5 text-xs font-bold text-accent backdrop-blur-sm">
              #{article.rank}
            </span>
            <span className="inline-flex items-center rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-breaking backdrop-blur-sm">
              {article.category}
            </span>
          </div>

          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs font-bold backdrop-blur-sm" title="Total Score">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-accent">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="text-accent">{article.total_score}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <time className="text-[11px] font-medium text-text-muted">
            {formatDate(article.date)}
          </time>
          <h3 className="mt-1.5 font-heading text-lg font-bold leading-snug transition-colors group-hover:text-accent">
            {article.title}
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary line-clamp-2">
            {preview}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-3 text-[10px] font-medium text-text-muted">
              <span title="Information Density">INFO {article.information_density}/5</span>
              <span title="Trend Score">TREND {article.trend_score}/5</span>
              <span title="Utility Score">UTIL {article.utility_score}/5</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-accent">
              Read
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </article>
    </button>
  )
}
