import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gear Recommendations',
  description:
    'AI-ranked baseball gear picks by position (up to five per category) — gloves, bats, cleats, helmets, notes, and retailer links.',
}

export default function GearRecommendationsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
