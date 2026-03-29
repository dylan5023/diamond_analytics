import { NextRequest, NextResponse } from 'next/server'

function isAllowedGoogleShoppingThumb(u: URL): boolean {
  if (u.protocol !== 'https:') return false
  if (!/^encrypted-tbn\d*\.gstatic\.com$/i.test(u.hostname)) return false
  return u.pathname === '/shopping' || u.pathname.startsWith('/shopping/')
}

/** Small neutral SVG so the browser still gets HTTP 200 when upstream image fails (no failed request noise in DevTools). */
const FALLBACK_SVG = new TextEncoder().encode(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#232830" width="400" height="300"/></svg>`,
)

function fallbackResponse() {
  return new NextResponse(FALLBACK_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=120',
      'X-Thumb-Upstream': 'miss',
    },
  })
}

/**
 * Same-origin proxy for Google Shopping CDN thumbnails only.
 * The browser requests this route (typically 200); upstream 404s are handled server-side.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')
  if (!raw?.trim()) {
    return fallbackResponse()
  }

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return fallbackResponse()
  }

  if (!isAllowedGoogleShoppingThumb(target)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const res = await fetch(target.href, {
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    const ct = res.headers.get('content-type') ?? ''
    if (!res.ok || !ct.startsWith('image/')) {
      return fallbackResponse()
    }

    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0) {
      return fallbackResponse()
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': ct.split(';')[0] || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'X-Thumb-Upstream': 'hit',
      },
    })
  } catch {
    return fallbackResponse()
  }
}
