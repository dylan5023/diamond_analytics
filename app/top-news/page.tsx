'use client'

import { useState } from 'react'
import useSWR from 'swr'
import type { NewsArticle } from '@/types'
import { fetcher, formatDate } from '@/lib/utils'
import NewsCard from '@/components/NewsCard'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/MotionWrapper'

function ScoreBar({ label, score, max = 5 }: { label: string; score: number; max?: number }) {
  const pct = (score / max) * 100
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-text-secondary">{label}</span>
        <span className="font-bold text-accent">{score}/{max}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-surface">
        <div
          className="h-1.5 rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

type SortMode = 'latest' | 'score'

export default function TopNewsPage() {
  const [selected, setSelected] = useState<NewsArticle | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('latest')

  const { data: articles, error, isLoading } = useSWR<NewsArticle[]>(
    '/api/topNews',
    fetcher,
    { refreshInterval: 1000 * 60 * 10 }
  )

  const sorted = articles?.slice().sort((a, b) => {
    if (sortMode === 'score') return b.total_score - a.total_score
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <FadeIn>
        <div className="mb-12 flex items-start justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-breaking/30 bg-breaking/10 px-3 py-1 text-xs font-medium text-breaking">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-breaking" />
              Updated every 6 hours
            </div>
            <h1 className="font-heading text-4xl font-extrabold tracking-tight md:text-5xl">
              Top News
            </h1>
            <p className="mt-3 max-w-lg text-text-secondary">
              The latest MLB headlines, AI-scored by information density, trend relevance, and analytical utility.
            </p>
          </div>
          <div className="mt-4 flex gap-2 md:mt-0">
            <button
              type="button"
              onClick={() => setSortMode('latest')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                sortMode === 'latest'
                  ? 'bg-accent text-navy'
                  : 'bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Latest
            </button>
            <button
              type="button"
              onClick={() => setSortMode('score')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                sortMode === 'score'
                  ? 'bg-accent text-navy'
                  : 'bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Top Score
            </button>
          </div>
        </div>
      </FadeIn>

      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse">
              <div className="h-44 bg-surface" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-20 rounded bg-surface" />
                <div className="h-5 w-3/4 rounded bg-surface" />
                <div className="h-4 w-full rounded bg-surface" />
                <div className="h-4 w-2/3 rounded bg-surface" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="glass-card p-8 text-center">
          <p className="text-text-secondary">Failed to load news. Please try again later.</p>
        </div>
      )}

      {sorted && (
        <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((article, i) => (
            <StaggerItem key={`news-${i}-${article.rank}`}>
              <NewsCard article={article} onClick={() => setSelected(article)} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="glass-card relative max-h-[90vh] w-full max-w-3xl overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-md bg-accent/20 px-2.5 py-1 text-xs font-bold text-accent">
                #{selected.rank}
              </span>
              <span className="inline-flex items-center rounded-md bg-breaking/20 px-2.5 py-1 text-xs font-semibold text-breaking">
                {selected.category}
              </span>
              <time className="text-xs text-text-muted">
                {formatDate(selected.date)}
              </time>
              <span className="ml-auto inline-flex items-center gap-1 text-sm font-bold text-accent">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-accent">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                {selected.total_score}/15
              </span>
            </div>

            <h2 className="font-heading text-2xl font-extrabold leading-tight md:text-3xl">
              {selected.title}
            </h2>

            {selected.image_thumbnail && (
              <img
                src={selected.image_thumbnail}
                alt={selected.title}
                className="mt-4 w-full rounded-xl object-cover"
              />
            )}

            <div
              className="news-content mt-6 text-text-secondary leading-relaxed"
              dangerouslySetInnerHTML={{ __html: selected.html }}
            />

            <div className="mt-8 rounded-xl border border-accent/20 bg-navy-card p-6">
              <h4 className="font-heading text-base font-bold text-text-primary">AI Analysis Scores</h4>

              <div className="mt-5 space-y-5">
                <div>
                  <ScoreBar label="Information Density" score={selected.information_density} />
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{selected.information_density_reasoning}</p>
                </div>
                <div>
                  <ScoreBar label="Trend Relevance" score={selected.trend_score} />
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{selected.trend_reasoning}</p>
                </div>
                <div>
                  <ScoreBar label="Analytical Utility" score={selected.utility_score} />
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{selected.utility_reasoning}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <a
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-accent/20 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/30"
              >
                Read Original Article
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17 17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
