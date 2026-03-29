import { NextRequest, NextResponse } from 'next/server'

const BLOCKED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'])

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0] ?? ''
  if (BLOCKED_HOSTNAMES.has(h)) return true
  if (h.endsWith('.localhost')) return true
  if (h.startsWith('192.168.')) return true
  if (h.startsWith('10.')) return true
  if (h.startsWith('169.254.')) return true
  if (h.startsWith('172.')) {
    const second = parseInt(h.split('.')[1] ?? '0', 10)
    if (second >= 16 && second <= 31) return true
  }
  return false
}

function decodeMetaContent(raw: string): string {
  return raw
    .trim()
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function extractOgImage(html: string, pageUrl: string): string | null {
  const patterns = [
    /<meta\s[^>]*property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']+)["']/i,
    /<meta\s[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:image["']/i,
    /<meta\s[^>]*property\s*=\s*["']og:image:secure_url["'][^>]*content\s*=\s*["']([^"']+)["']/i,
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) {
      const decoded = decodeMetaContent(m[1])
      try {
        return new URL(decoded, pageUrl).href
      } catch {
        return decoded
      }
    }
  }
  return null
}

/**
 * GET ?url= — fetch page HTML server-side and return og:image (if any).
 * Google Shopping / search URLs are rejected: no reliable product og:image; use DB `thumbnail` in the UI instead.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')
  if (!raw?.trim()) {
    return NextResponse.json({ imageUrl: null, error: 'missing_url' }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return NextResponse.json({ imageUrl: null, error: 'invalid_url' }, { status: 400 })
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return NextResponse.json({ imageUrl: null, error: 'invalid_protocol' }, { status: 400 })
  }

  if (isBlockedHost(target.hostname)) {
    return NextResponse.json({ imageUrl: null, error: 'blocked_host' }, { status: 403 })
  }

  const host = target.hostname.toLowerCase()
  if (host === 'google.com' || host === 'www.google.com' || host.endsWith('.google.com')) {
    return NextResponse.json({ imageUrl: null, error: 'google_listing_unsupported' })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)

  try {
    const res = await fetch(target.href, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    const finalUrl = res.url || target.href

    if (!res.ok) {
      return NextResponse.json({ imageUrl: null })
    }

    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('text/html') && !ct.includes('application/xhtml') && !ct.includes('application/xhtml+xml')) {
      return NextResponse.json({ imageUrl: null })
    }

    const buf = await res.arrayBuffer()
    const cap = 600_000
    const slice = buf.byteLength > cap ? buf.slice(0, cap) : buf
    const html = new TextDecoder('utf-8', { fatal: false }).decode(slice)

    const imageUrl = extractOgImage(html, finalUrl)
    return NextResponse.json({ imageUrl })
  } catch {
    return NextResponse.json({ imageUrl: null })
  } finally {
    clearTimeout(timer)
  }
}
