'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { FadeIn, FadeInOnScroll } from '@/components/MotionWrapper'

const features = [
  {
    title: 'Live Dashboard',
    description:
      "Real-time scores and win probability for today's games — MLB page, refreshed every 15 minutes.",
    href: '/mlb',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    title: 'AI-Powered Blog',
    description: 'YouTube comment sentiment analysis transformed into insightful baseball blog posts by AI.',
    href: '/blogs',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        <path d="M8 7h6" />
        <path d="M8 11h8" />
      </svg>
    ),
  },
  {
    title: 'Top News',
    description: 'Breaking MLB news scraped, summarized, and delivered every 6 hours from top sources.',
    href: '/top-news',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14h-8" />
        <path d="M15 18h-5" />
        <rect x="10" y="6" width="8" height="4" rx="1" />
      </svg>
    ),
  },
  {
    title: 'Player Dashboard',
    description: 'Season leaderboards for qualified hitters and pitchers — browse stats and open player charts.',
    href: '/dashboard',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 16V9" />
        <path d="M12 16v-5" />
        <path d="M17 16V6" />
      </svg>
    ),
  },
  {
    title: 'Gear Word Cloud',
    description: 'Visual word frequency map from thousands of baseball gear reviews across the web.',
    href: '/word-cloud',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      </svg>
    ),
  },
]

const stats = [
  { label: 'Blog Posts', value: '50+', suffix: 'AI-generated' },
  { label: 'News Updates', value: '4x', suffix: 'daily' },
  { label: 'Live Games', value: '15', suffix: 'tracked' },
  { label: 'Reviews Analyzed', value: '10K+', suffix: 'weekly' },
]

export default function Home() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute top-60 -left-40 h-[400px] w-[400px] rounded-full bg-accent/3 blur-[100px]" />
      </div>

      <section className="relative mx-auto max-w-7xl px-6 pb-20 pt-24 md:pt-32">
        <FadeIn>
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-text-secondary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-live live-dot" />
              Powered by n8n + MLB Stats API
            </div>
            <h1 className="font-heading text-5xl font-extrabold leading-[1.1] tracking-tight md:text-7xl">
              Baseball Intelligence,{' '}
              <span className="gradient-text">Automated</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
              Real-time MLB data, AI-generated analysis, and gear insights — 
              all powered by automated pipelines that never sleep.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/mlb"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-7 text-sm font-semibold text-white transition-all hover:bg-accent-dim hover:shadow-lg hover:shadow-accent/20"
              >
                <span className="inline-block h-2 w-2 rounded-full bg-live live-dot" />
                Live Dashboard
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center rounded-xl border border-border px-7 text-sm font-semibold text-text-secondary transition-all hover:border-border-hover hover:text-text-primary"
              >
                Player Dashboard
              </Link>
              <Link
                href="/blogs"
                className="inline-flex h-12 items-center rounded-xl border border-border px-7 text-sm font-semibold text-text-secondary transition-all hover:border-border-hover hover:text-text-primary"
              >
                Read Latest Posts
              </Link>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                className="glass-card p-5 text-center"
              >
                <div className="font-heading text-3xl font-extrabold text-accent stat-glow">{stat.value}</div>
                <div className="mt-1 text-xs font-medium text-text-secondary">{stat.label}</div>
                <div className="text-[10px] text-text-muted">{stat.suffix}</div>
              </motion.div>
            ))}
          </div>
        </FadeIn>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 pb-32">
        <FadeInOnScroll>
          <h2 className="font-heading text-center text-3xl font-bold tracking-tight md:text-4xl">
            Explore the platform
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-text-secondary">
            Live MLB games, season leaderboards, news, blogs, and more — much of it fed by n8n pipelines around the
            clock.
          </p>
        </FadeInOnScroll>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {features.map((feature, i) => (
            <FadeInOnScroll key={feature.title} delay={i * 0.08}>
              <Link href={feature.href} className="group block">
                <div className="glass-card flex h-full flex-col p-6 transition-all group-hover:border-accent/30 group-hover:shadow-lg group-hover:shadow-accent/5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
                    {feature.icon}
                  </div>
                  <h3 className="font-heading text-lg font-bold">{feature.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                    {feature.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                    Explore
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            </FadeInOnScroll>
          ))}
        </div>
      </section>
    </div>
  )
}
