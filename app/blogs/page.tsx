'use client'

import useSWR from 'swr'
import type { BlogPost } from '@/types'
import { fetcher } from '@/lib/utils'
import BlogCard from '@/components/BlogCard'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/MotionWrapper'

export default function BlogsPage() {
  const { data: posts, error, isLoading } = useSWR<BlogPost[]>('/api/blogs', fetcher)

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <FadeIn>
        <div className="mb-12">
          <h1 className="font-heading text-4xl font-extrabold tracking-tight md:text-5xl">
            Blog
          </h1>
          <p className="mt-3 max-w-2xl text-text-secondary">
            AI-assisted articles and pipeline-driven notes from baseball data and YouTube
            discourse — sentiment, trends, and deeper cuts you can skim or save for later.
          </p>
          <div className="glass-card mt-6 max-w-2xl p-5 md:p-6">
            <p className="font-heading text-xs font-semibold uppercase tracking-wider text-accent">
              Daily morning brief
            </p>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Each day at{' '}
              <span className="font-medium text-text-primary">7:00 AM Vancouver time</span>{' '}
              (Pacific), a scheduled post goes live with the previous night&apos;s MLB snapshot —
              pulled from your data pipelines so the recap is on time, every time.
            </p>
            <ul className="mt-4 grid gap-2.5 text-sm text-text-secondary sm:grid-cols-2">
              <li className="flex gap-2">
                <span className="shrink-0 text-accent" aria-hidden>
                  —
                </span>
                <span>
                  <strong className="font-medium text-text-primary">Scores &amp; results</strong> —
                  finals and storylines from the night before
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-accent" aria-hidden>
                  —
                </span>
                <span>
                  <strong className="font-medium text-text-primary">Top hitters</strong> — who
                  carried the offense
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-accent" aria-hidden>
                  —
                </span>
                <span>
                  <strong className="font-medium text-text-primary">Top pitchers</strong> —
                  standout starts and relief
                </span>
              </li>
              <li className="flex gap-2 sm:col-span-2">
                <span className="shrink-0 text-accent" aria-hidden>
                  —
                </span>
                <span>
                  <strong className="font-medium text-text-primary">Game of the day</strong> —
                  the one game worth revisiting and why
                </span>
              </li>
            </ul>
          </div>
        </div>
      </FadeIn>

      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card animate-pulse">
              <div className="h-40 bg-surface" />
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
          <p className="text-text-secondary">Failed to load blog posts. Please try again later.</p>
        </div>
      )}

      {posts && (
        <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <StaggerItem key={post.id}>
              <BlogCard post={post} index={i} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  )
}
