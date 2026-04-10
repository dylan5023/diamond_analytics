import type { Metadata } from 'next'
import Link from 'next/link'
import { IBM_Plex_Sans, Barlow_Condensed } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { GoogleAnalytics } from '@next/third-parties/google'
import Navbar from '@/components/Navbar'
import ChatButton from '@/components/ChatButton'
import './globals.css'

const ibmPlex = IBM_Plex_Sans({
  variable: '--font-ibm-plex',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const barlow = Barlow_Condensed({
  variable: '--font-barlow',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const BASE_URL = 'https://alog-diamond-analytics.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Diamond Analytics — MLB Live Scores, Win Probability & AI News',
    template: '%s | Diamond Analytics',
  },
  description:
    'Real-time MLB live scores, win probability predictions, AI-curated news, player stat leaderboards, and gear recommendations — all in one place.',
  keywords: [
    'MLB live scores',
    'baseball win probability',
    'MLB analytics',
    'AI baseball news',
    'real-time baseball stats',
    'MLB dashboard',
    'baseball data',
    'player leaderboard',
  ],
  authors: [{ name: 'Dylan Kang' }],
  creator: 'Dylan Kang',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Diamond Analytics',
    title: 'Diamond Analytics — MLB Live Scores, Win Probability & AI News',
    description:
      'Real-time MLB live scores, win probability predictions, AI-curated news, and player stat leaderboards.',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'Diamond Analytics' }],
  },
  twitter: {
    card: 'summary',
    title: 'Diamond Analytics — MLB Live Scores, Win Probability & AI News',
    description:
      'Real-time MLB live scores, win probability predictions, AI-curated news, and player stat leaderboards.',
    images: ['/icon-512.png'],
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${ibmPlex.variable} ${barlow.variable} antialiased`} suppressHydrationWarning>
        <Navbar />
        <main className="min-h-screen pt-16">
          {children}
        </main>
        <ChatButton />
        <Analytics />
        <GoogleAnalytics gaId="G-7HC2FG0LB0" />
        <footer className="border-t border-[#3a3a3a] bg-[#2a2a2a]">
          <div className="mx-auto w-full px-6 py-6 lg:px-10 xl:px-14">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <Link
                href="/"
                className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
              >
                <img
                  src="/icon-192.png"
                  alt="Diamond Analytics"
                  width={28}
                  height={28}
                  className="rounded-md"
                />
                <span className="font-heading text-sm font-semibold text-[#f0f0f0]">
                  Diamond Analytics
                </span>
              </Link>
              <div className="flex flex-col items-center gap-1 md:items-end">
                <p className="text-xs text-[#a0a0a0]">
                  Powered by n8n automation & real-time MLB data. Not affiliated with MLB.
                </p>
                <p className="text-xs text-[#a0a0a0]">
                  Built by <span className="text-accent">Dylan Kang</span>
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-6 md:flex md:justify-end">
              <div className="mx-auto max-w-3xl text-center md:mx-0 md:text-right">
                <p className="text-[11px] leading-relaxed text-[#c8c8c8]">
                  <span className="font-medium text-[#dcdcdc]">Data attribution.</span> Statistics, scores, and
                  related baseball data on this site are sourced from MLB Advanced Media / official MLB feeds. © 2026
                  MLB Advanced Media, L.P.
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-[#b0b0b0]">
                  Use of any content on this page acknowledges agreement to the terms posted at{' '}
                  <a
                    href="https://gdx.mlb.com/components/copyright.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-accent underline decoration-accent/50 underline-offset-2 transition-colors hover:text-accent-light hover:decoration-accent-light"
                  >
                    gdx.mlb.com/components/copyright.txt
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
