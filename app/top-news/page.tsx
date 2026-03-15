'use client'

import useSWR from 'swr'
import type { NewsArticle } from '@/types'
import { fetcher } from '@/lib/utils'
import NewsCard from '@/components/NewsCard'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/MotionWrapper'

export default function TopNewsPage() {
  const { data: articles, error, isLoading } = useSWR<NewsArticle[]>(
    '/api/topNews',
    fetcher,
    { refreshInterval: 1000 * 60 * 10 }
  )

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
              The latest MLB headlines, scraped and AI-summarized from top sports sources.
            </p>
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

      {articles && (
        <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article, i) => (
            <StaggerItem key={article.url || i}>
              <NewsCard article={article} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  )
}
