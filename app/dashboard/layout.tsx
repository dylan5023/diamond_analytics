import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
  description:
    'Real-time MLB player stat leaderboards — AVG, HR, RBI, OPS, ERA, WHIP — alongside live win probability predictions updated continuously throughout the season.',
  keywords: ['MLB player stats', 'baseball leaderboard', 'AVG HR RBI OPS ERA WHIP', 'MLB dashboard', 'baseball analytics'],
  openGraph: {
    title: 'MLB Stats Dashboard | Diamond Analytics',
    description:
      'Real-time MLB player leaderboards and win probability predictions — AVG, HR, RBI, OPS, ERA, WHIP and more.',
    url: 'https://alog-diamond-analytics.vercel.app/dashboard',
  },
  twitter: {
    title: 'MLB Stats Dashboard | Diamond Analytics',
    description:
      'Real-time MLB player leaderboards — AVG, HR, RBI, OPS, ERA, WHIP and live win probability predictions.',
  },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
