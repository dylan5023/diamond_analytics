import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Top News',
  description:
    'AI-curated MLB headlines scored by information density, trend relevance, and analytical utility — refreshed every 6 hours from ESPN, MLB.com, and major baseball outlets.',
  keywords: ['MLB news', 'baseball headlines', 'AI curated news', 'MLB 2026', 'baseball digest'],
  openGraph: {
    title: 'MLB Top News — AI-Curated Headlines | Diamond Analytics',
    description:
      'The most important MLB stories, ranked by AI across information density, trend relevance, and analytical utility. Updated every 6 hours.',
    url: 'https://diamond-analytics.vercel.app/top-news',
  },
  twitter: {
    title: 'MLB Top News — AI-Curated Headlines | Diamond Analytics',
    description:
      'AI-ranked MLB headlines refreshed every 6 hours — no noise, just the stories that matter.',
  },
}

export default function TopNewsLayout({ children }: { children: React.ReactNode }) {
  return children
}
