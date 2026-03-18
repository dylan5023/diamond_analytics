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

function DatePicker({
  dates,
  selected,
  onChange,
}: {
  dates: string[]
  selected: string | null
  onChange: (d: string) => void
}) {
  if (dates.length === 0) return null

  const selectedIdx = selected ? dates.indexOf(selected) : 0
  const canPrev = selectedIdx < dates.length - 1
  const canNext = selectedIdx > 0

  function displayDate(d: string) {
    const dt = new Date(d + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (dt.getTime() === today.getTime()) return 'Today'
    if (dt.getTime() === yesterday.getTime()) return 'Yesterday'

    return dt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    })
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => canPrev && onChange(dates[selectedIdx + 1])}
        className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent"
        title="Previous day"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <div className="relative">
        <select
          value={selected ?? dates[0]}
          onChange={e => onChange(e.target.value)}
          className="appearance-none rounded-lg border border-white/10 bg-surface px-4 py-2 pr-8 text-sm font-semibold text-text-primary transition-colors hover:border-accent/40 focus:border-accent focus:outline-none"
        >
          {dates.map(d => (
            <option key={d} value={d}>
              {displayDate(d)} — {d}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted"
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      <button
        type="button"
        disabled={!canNext}
        onClick={() => canNext && onChange(dates[selectedIdx - 1])}
        className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent"
        title="Next day"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  )
}

type SortMode = 'latest' | 'score-desc' | 'score-asc'

export default function TopNewsPage() {
  const [selected, setSelected] = useState<NewsArticle | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('latest')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const { data: dates } = useSWR<string[]>(
    '/api/topNews/dates',
    fetcher,
    { refreshInterval: 1000 * 60 * 10 }
  )

  const activeDate = selectedDate ?? (dates && dates.length > 0 ? dates[0] : null)

  const { data: articles, error, isLoading } = useSWR<NewsArticle[]>(
    activeDate ? `/api/topNews?date=${activeDate}` : '/api/topNews',
    fetcher,
    { refreshInterval: 1000 * 60 * 10 }
  )

  const sorted = (Array.isArray(articles) ? articles : undefined)?.slice().sort((a, b) => {
    if (sortMode === 'score-desc') return Number(b.total_score) - Number(a.total_score)
    if (sortMode === 'score-asc') return Number(a.total_score) - Number(b.total_score)
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  const hasDates = dates && dates.length > 0

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <FadeIn>
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
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

          <div className="flex flex-col items-start gap-3 md:items-end">
            {hasDates && (
              <DatePicker
                dates={dates}
                selected={activeDate}
                onChange={setSelectedDate}
              />
            )}
            <div className="flex gap-2">
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
                onClick={() =>
                  setSortMode(prev =>
                    prev === 'score-desc' ? 'score-asc' : 'score-desc'
                  )
                }
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                  sortMode === 'score-desc' || sortMode === 'score-asc'
                    ? 'bg-accent text-navy'
                    : 'bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Score
                {(sortMode === 'score-desc' || sortMode === 'score-asc') && (
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className={`transition-transform ${sortMode === 'score-asc' ? 'rotate-180' : ''}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                )}
              </button>
            </div>
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

      {!isLoading && sorted && sorted.length === 0 && (
        <div className="glass-card p-12 text-center">
          <svg className="mx-auto mb-4 text-text-muted" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-lg font-semibold text-text-secondary">No articles for this date</p>
          <p className="mt-1 text-sm text-text-muted">Try selecting a different date above.</p>
        </div>
      )}

      {sorted && sorted.length > 0 && (() => {
        const scoreRankMap = new Map<NewsArticle, number>()
        const byScore = [...sorted].sort((a, b) => b.total_score - a.total_score)
        byScore.slice(0, 3).forEach((a, i) => scoreRankMap.set(a, i + 1))

        return (
          <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((article, i) => (
              <StaggerItem key={`news-${i}-${article.rank}`}>
                <NewsCard
                  article={article}
                  onClick={() => setSelected(article)}
                  scoreRank={scoreRankMap.get(article)}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )
      })()}

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
