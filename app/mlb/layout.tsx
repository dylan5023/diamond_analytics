import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MLB Live',
  description:
    'Live MLB game scores, win probability bars, linescore breakdowns, and play-by-play details — updated every 15 minutes throughout the 2026 season.',
  keywords: ['MLB live scores', 'baseball live game', 'win probability', 'MLB 2026', 'linescore', 'play-by-play'],
  openGraph: {
    title: 'MLB Live Scores & Win Probability | Diamond Analytics',
    description:
      'Track every MLB game in real time — live scores, win probability predictions, inning-by-inning linescores, and player stats.',
    url: 'https://alog-diamond-analytics.vercel.app/mlb',
  },
  twitter: {
    title: 'MLB Live Scores & Win Probability | Diamond Analytics',
    description:
      'Track every MLB game in real time — live scores, win probability predictions, and player stats.',
  },
}

export default function MlbLayout({ children }: { children: React.ReactNode }) {
  return children
}
