import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gear Recommendations',
  description: 'Position-based baseball gear picks — gloves, bats, cleats, and helmets with retailer links.',
}

export default function GearRecommendationsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
