import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gear Recommendations',
  description:
    'AI-ranked baseball gear picks by fielding position — gloves, bats, cleats, and helmets with ratings, key features, and direct retailer links.',
  keywords: ['baseball gear', 'baseball glove', 'baseball bat', 'baseball cleats', 'baseball helmet', 'MLB equipment'],
  openGraph: {
    title: 'Baseball Gear Recommendations by Position | Diamond Analytics',
    description:
      'AI-ranked gloves, bats, cleats, and helmets for every fielding position — with ratings and retailer links.',
    url: 'https://diamond-analytics.vercel.app/gear-recommendations',
  },
  twitter: {
    title: 'Baseball Gear Recommendations by Position | Diamond Analytics',
    description:
      'AI-ranked baseball gear picks by position — gloves, bats, cleats, helmets with ratings and retailer links.',
  },
}

export default function GearRecommendationsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
