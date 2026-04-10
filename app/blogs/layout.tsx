import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'AI-generated baseball analysis and fan sentiment posts — sourced from YouTube comment trends and real MLB data to surface what the baseball community is talking about.',
  keywords: ['baseball blog', 'MLB analysis', 'fan sentiment', 'AI baseball', 'baseball opinion'],
  openGraph: {
    title: 'Baseball Blog — AI-Powered Analysis | Diamond Analytics',
    description:
      'Deep-dive baseball posts generated from YouTube fan sentiment and real MLB data.',
    url: 'https://diamond-analytics.vercel.app/blogs',
  },
  twitter: {
    title: 'Baseball Blog — AI-Powered Analysis | Diamond Analytics',
    description:
      'AI-generated baseball analysis sourced from fan sentiment and real MLB data.',
  },
}

export default function BlogsLayout({ children }: { children: React.ReactNode }) {
  return children
}
