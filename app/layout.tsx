import type { Metadata } from 'next'
import { IBM_Plex_Sans, Barlow_Condensed } from 'next/font/google'
import Navbar from '@/components/Navbar'
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

export const metadata: Metadata = {
  title: {
    default: 'Diamond Analytics — Baseball Data Intelligence',
    template: '%s | Diamond Analytics',
  },
  description: 'Real-time MLB analytics, AI-powered blog posts, top news, player dashboards, and gear insights — all in one place.',
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
        <footer className="border-t border-[#3a3a3a] bg-[#2a2a2a]">
          <div className="mx-auto w-full px-6 py-5 lg:px-10 xl:px-14">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div className="flex items-center gap-2.5">
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
              </div>
              <div className="flex flex-col items-center gap-1 md:items-end">
                <p className="text-xs text-[#a0a0a0]">
                  Powered by n8n automation & real-time MLB data. Not affiliated with MLB.
                </p>
                <p className="text-xs text-[#a0a0a0]">
                  Built by <span className="text-accent">Dylan Kang</span>
                </p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
