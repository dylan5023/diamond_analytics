'use client'

import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import type { BlogPost } from '@/types'
import { fetcher } from '@/lib/utils'
import BlogCard from '@/components/BlogCard'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/MotionWrapper'

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

function MonthDropdown({
  months,
  value,
  onChange,
}: {
  months: string[]
  value: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex min-w-[140px] items-center justify-between gap-2 rounded-lg border border-white/10 bg-surface px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-accent/40 focus:border-accent focus:outline-none"
      >
        <span>{formatMonthLabel(value)}</span>
        <svg
          className={`shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul className="absolute left-0 top-full z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-white/10 bg-[#1a1f2e] py-1 shadow-xl">
          {months.map(m => (
            <li key={m}>
              <button
                type="button"
                onClick={() => { onChange(m); setOpen(false) }}
                className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-white/5 ${m === value ? 'font-semibold text-accent' : 'text-text-primary'}`}
              >
                {formatMonthLabel(m)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function BlogsPage() {
  const { data: months } = useSWR<string[]>('/api/blogs?months', fetcher)

  const currentMonth = new Date().toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  const activeMonth = selectedMonth ?? (months?.[0] ?? currentMonth)

  const { data: posts, error, isLoading } = useSWR<BlogPost[]>(
    `/api/blogs?month=${activeMonth}`,
    fetcher
  )

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <FadeIn>
        <div className="mb-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="font-heading text-4xl font-extrabold tracking-tight md:text-5xl">
              Blog
            </h1>
            {months && months.length > 0 && (
              <MonthDropdown
                months={months}
                value={activeMonth}
                onChange={setSelectedMonth}
              />
            )}
          </div>
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

      {/* 최소 높이 고정으로 월 전환 시 레이아웃 점프 방지 */}
      <div className="min-h-[480px]">
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

        {!isLoading && posts && posts.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-text-secondary">No posts for this month.</p>
          </div>
        )}

        {!isLoading && posts && posts.length > 0 && (
          <StaggerContainer className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, i) => (
              <StaggerItem key={post.id}>
                <BlogCard post={post} index={i} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </div>
  )
}
