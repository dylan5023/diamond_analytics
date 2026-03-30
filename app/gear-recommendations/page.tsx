'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import type { PositionGearRecommendationRow, RecommendedGearProduct } from '@/types'
import { supabase } from '@/lib/supabase'
import { FadeIn, FadeInOnScroll } from '@/components/MotionWrapper'
import MlbModal from '@/components/mlb/MlbModal'

/* Thumbnail state is reset when `src` / retailer changes and async proxy/OG fetches run in effects. */
/* eslint-disable react-hooks/set-state-in-effect */

const POSITIONS = [
  { value: 'pitcher', label: 'Pitcher' },
  { value: 'catcher', label: 'Catcher' },
  { value: 'infield', label: 'Infielder' },
  { value: 'outfield', label: 'Outfielder' },
] as const

const GEAR_CATEGORIES = ['Glove', 'Bat', 'Cleats', 'Helmet'] as const

type PositionValue = (typeof POSITIONS)[number]['value']
type GearCategory = (typeof GEAR_CATEGORIES)[number] | null

/** DB가 `jsonb`가 아니라 `text`이면 PostgREST가 배열 대신 JSON 문자열로 돌려줄 수 있음 */
function parseRecommendedProducts(raw: PositionGearRecommendationRow['recommended_products']): RecommendedGearProduct[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? (parsed as RecommendedGearProduct[]) : []
    } catch {
      return []
    }
  }
  return []
}

async function fetchRowsForPosition(position: PositionValue): Promise<PositionGearRecommendationRow[]> {
  const { data, error } = await supabase
    .from('position_gear_recommendations')
    .select('*')
    .eq('position', position)
    .order('gear_category')

  if (error) throw error
  return (data ?? []) as PositionGearRecommendationRow[]
}

function StarRow({ rating }: { rating: number | null | undefined }) {
  const n = Math.max(0, Math.min(5, Math.round(rating ?? 0)))
  return (
    <div className="flex items-center gap-0.5 text-accent" aria-label={`Rating ${n} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < n ? 'opacity-100' : 'opacity-25'}>
          ★
        </span>
      ))}
    </div>
  )
}

function formatPrice(price: number | undefined) {
  return typeof price === 'number'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
    : '—'
}

function formatMetaLabel(raw: string) {
  return raw
    .trim()
    .split(/[\s_-]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

/** Google search / shopping links rarely expose a useful og:image; avoids slow no-op API calls. */
function isGoogleListingUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host === 'google.com' || host === 'www.google.com' || host.endsWith('.google.com')
  } catch {
    return false
  }
}

/**
 * Google Shopping CDN thumbnails: proxied same-origin so DevTools does not show failed requests to gstatic.
 */
function isGoogleShoppingProxyThumbnail(url: string): boolean {
  try {
    const u = new URL(url)
    if (!/^encrypted-tbn\d*\.gstatic\.com$/i.test(u.hostname)) return false
    return u.pathname === '/shopping' || u.pathname.startsWith('/shopping/')
  } catch {
    return false
  }
}

/** When custom response headers are not visible to `fetch`, still detect a real raster body. */
function bufferLooksLikeRasterImage(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 4) return false
  const v = new Uint8Array(buf, 0, 12)
  if (v[0] === 0xff && v[1] === 0xd8) return true // JPEG
  if (v[0] === 0x89 && v[1] === 0x50 && v[2] === 0x4e && v[3] === 0x47) return true // PNG
  if (v[0] === 0x47 && v[1] === 0x49 && v[2] === 0x46) return true // GIF
  if (v[0] === 0x52 && v[1] === 0x49 && v[2] === 0x46 && v[3] === 0x46) return true // RIFF (webp)
  return false
}

/**
 * 1) Load DB `thumbnail` (Google Shopping URLs via `/api/gear/thumb-proxy` to avoid browser-side 404 noise).
 * 2) If missing or load fails, try Open Graph from `retailerPageUrl` (non-Google listings only).
 */
function GearThumbnail({
  src,
  retailerPageUrl,
  alt,
  sizes,
  imgClassName,
  placeholderText,
  placeholderClassName,
  loadingClassName,
  retailerHintContext = 'grid',
}: {
  src: string | null | undefined
  retailerPageUrl?: string | null
  alt: string
  sizes: string
  imgClassName: string
  placeholderText: string
  placeholderClassName: string
  loadingClassName?: string
  /** `grid`: card on listing. `modal`: image area in detail dialog (View at retailer is below). */
  retailerHintContext?: 'grid' | 'modal'
}) {
  const [primaryFailed, setPrimaryFailed] = useState(false)
  const [ogImage, setOgImage] = useState<string | null>(null)
  const [ogBroken, setOgBroken] = useState(false)
  const [ogLoading, setOgLoading] = useState(false)
  const [proxyPhase, setProxyPhase] = useState<'idle' | 'loading' | 'ready' | 'miss'>('idle')
  const [proxyBlobUrl, setProxyBlobUrl] = useState<string | null>(null)
  const proxyBlobRef = useRef<string | null>(null)

  const trimmed = src?.trim() ?? ''
  const retailer = retailerPageUrl?.trim() ?? ''
  const hasThumbnail = trimmed.length > 0
  const showPrimary = hasThumbnail && !primaryFailed
  const useThumbProxy = hasThumbnail && isGoogleShoppingProxyThumbnail(trimmed)

  useEffect(() => {
    setPrimaryFailed(false)
    setOgImage(null)
    setOgBroken(false)
    setOgLoading(false)
    setProxyPhase('idle')
    setProxyBlobUrl(null)
    if (proxyBlobRef.current) {
      URL.revokeObjectURL(proxyBlobRef.current)
      proxyBlobRef.current = null
    }
  }, [trimmed, retailer])

  useEffect(() => {
    if (!useThumbProxy) {
      return
    }

    setProxyPhase('loading')
    let cancelled = false

    fetch(`/api/gear/thumb-proxy?url=${encodeURIComponent(trimmed)}`)
      .then(async r => {
        if (cancelled) return
        if (!r.ok) {
          setProxyPhase('miss')
          setPrimaryFailed(true)
          return
        }
        const upstream = r.headers.get('X-Thumb-Upstream')
        const ctRaw = r.headers.get('content-type') ?? ''
        const ct = ctRaw.split(';')[0].trim().toLowerCase()
        const buf = await r.arrayBuffer()
        if (cancelled) return

        const looksLikeFallbackSvg = ct.includes('svg') && buf.byteLength < 2000
        const ctSaysRaster = ct.startsWith('image/') && !ct.includes('svg')
        const inferHit =
          buf.byteLength > 0 &&
          (ctSaysRaster || bufferLooksLikeRasterImage(buf)) &&
          !looksLikeFallbackSvg

        const isHit =
          upstream === 'hit'
            ? buf.byteLength > 0
            : upstream === 'miss'
              ? false
              : inferHit

        if (isHit) {
          const mime = ctRaw.split(';')[0]?.trim() || 'image/jpeg'
          if (proxyBlobRef.current) {
            URL.revokeObjectURL(proxyBlobRef.current)
          }
          const objectUrl = URL.createObjectURL(new Blob([buf], { type: mime || 'image/jpeg' }))
          proxyBlobRef.current = objectUrl
          setProxyBlobUrl(objectUrl)
          setProxyPhase('ready')
        } else {
          setProxyPhase('miss')
          setPrimaryFailed(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProxyPhase('miss')
          setPrimaryFailed(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [trimmed, useThumbProxy])

  useEffect(() => {
    setOgBroken(false)
  }, [ogImage])

  useEffect(() => {
    const hasThumb = trimmed.length > 0
    if (!retailer || isGoogleListingUrl(retailer) || ogImage || (hasThumb && !primaryFailed)) {
      return
    }

    let cancelled = false
    setOgLoading(true)

    fetch(`/api/gear/og-image?url=${encodeURIComponent(retailer)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('og-image request failed'))))
      .then((data: { imageUrl?: string | null }) => {
        if (cancelled) return
        const u = data.imageUrl?.trim()
        if (u) setOgImage(u)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setOgLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [retailer, trimmed, primaryFailed, ogImage])

  if (useThumbProxy) {
    if (proxyPhase === 'loading' || (proxyPhase === 'idle' && hasThumbnail)) {
      return (
        <div
          className={`absolute inset-0 flex items-center justify-center text-xs ${loadingClassName ?? placeholderClassName}`}
        >
          Loading preview…
        </div>
      )
    }
    if (proxyPhase === 'ready' && proxyBlobUrl) {
      return (
        <Image
          src={proxyBlobUrl}
          alt={alt}
          fill
          sizes={sizes}
          className={imgClassName}
          unoptimized
          onError={() => setPrimaryFailed(true)}
        />
      )
    }
  }

  if (showPrimary && !useThumbProxy) {
    return (
      <Image
        src={trimmed}
        alt={alt}
        fill
        sizes={sizes}
        className={imgClassName}
        unoptimized
        onError={() => setPrimaryFailed(true)}
      />
    )
  }

  if (ogImage && !ogBroken) {
    return (
      <Image
        src={ogImage}
        alt={alt}
        fill
        sizes={sizes}
        className={imgClassName}
        unoptimized
        onError={() => setOgBroken(true)}
      />
    )
  }

  if (ogLoading) {
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center text-xs ${loadingClassName ?? placeholderClassName}`}
      >
        Loading preview…
      </div>
    )
  }

  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center ${placeholderClassName}`}>
      <span>{placeholderText}</span>
      {retailer ? (
        <span className="max-w-[16rem] text-[10px] leading-snug opacity-85">
          {retailerHintContext === 'modal' ? (
            <>
              Photos may not load in this preview. They appear on the retailer page—use{' '}
              <span className="font-semibold text-accent">View at retailer</span> below to see them.
            </>
          ) : (
            <>
              Photos may not load in this preview. They appear on the retailer page—open product details, then{' '}
              <span className="font-semibold text-accent">View at retailer</span> to see them.
            </>
          )}
        </span>
      ) : null}
    </div>
  )
}

function ProductCard({
  product,
  gearCategory,
  onOpen,
}: {
  product: RecommendedGearProduct
  gearCategory: string
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group glass-card flex h-full w-full flex-col overflow-hidden text-left transition-all hover:border-accent/35 hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-[0.85rem] bg-surface">
        <GearThumbnail
          src={product.thumbnail}
          retailerPageUrl={product.source_url}
          alt={product.product_name}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          imgClassName="object-cover"
          placeholderText="Image unavailable"
          placeholderClassName="bg-surface text-text-muted"
          loadingClassName="bg-surface text-text-muted"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{gearCategory}</p>
        <h3 className="mt-1 font-heading text-base font-bold leading-snug text-text-primary group-hover:text-accent">
          {product.product_name}
        </h3>
        <p className="mt-1 text-xs text-text-secondary">{product.brand}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold tabular-nums text-text-primary">{formatPrice(product.price)}</span>
          <StarRow rating={product.rating} />
        </div>
        {product.reason ? (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-text-secondary">{product.reason}</p>
        ) : null}
        <span className="mt-4 text-xs font-medium text-accent opacity-90 group-hover:opacity-100">
          View details →
        </span>
      </div>
    </button>
  )
}

function GearProductDetailModal({
  product,
  gearCategory,
  onClose,
}: {
  product: RecommendedGearProduct
  gearCategory: string
  onClose: () => void
}) {
  const href = product.source_url?.trim()

  return (
    <MlbModal title={product.product_name} onClose={onClose} wide>
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="relative mx-auto aspect-[4/3] w-full max-w-md shrink-0 overflow-hidden rounded-xl bg-white/5 md:mx-0 md:w-72">
          <GearThumbnail
            src={product.thumbnail}
            retailerPageUrl={product.source_url}
            alt={product.product_name}
            sizes="(max-width: 768px) 100vw, 288px"
            imgClassName="object-cover"
            placeholderText="Image unavailable"
            placeholderClassName="bg-white/5 text-sm text-slate-500"
            loadingClassName="bg-white/5 text-slate-400"
            retailerHintContext="modal"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{gearCategory}</p>
          <p className="text-sm text-slate-300">{product.brand}</p>
          {(product.target_level || product.price_range) && (
            <div className="flex flex-wrap gap-2">
              {product.target_level ? (
                <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200">
                  {formatMetaLabel(product.target_level)}
                </span>
              ) : null}
              {product.price_range ? (
                <span className="rounded-lg bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
                  {formatMetaLabel(product.price_range)}
                </span>
              ) : null}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-lg font-semibold tabular-nums text-white">{formatPrice(product.price)}</span>
            <div className="flex flex-wrap items-center gap-2">
              <StarRow rating={product.rating} />
              {typeof product.review_count === 'number' && product.review_count > 0 ? (
                <span className="text-sm tabular-nums text-slate-400">
                  ({product.review_count} {product.review_count === 1 ? 'review' : 'reviews'})
                </span>
              ) : null}
            </div>
          </div>
          {product.key_features && product.key_features.length > 0 ? (
            <div>
              <h3 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide text-slate-400">
                Key features
              </h3>
              <ul className="list-inside list-disc space-y-1 text-[15px] leading-relaxed text-slate-200">
                {product.key_features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <h3 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide text-slate-400">
              Why we recommend
            </h3>
            <p className="text-[15px] leading-relaxed text-slate-200">
              {product.reason?.trim() || 'No write-up for this pick yet.'}
            </p>
          </div>
          <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
            >
              Close
            </button>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-navy transition-opacity hover:opacity-95"
              >
                View at retailer
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </MlbModal>
  )
}

export default function GearRecommendationsPage() {
  const [position, setPosition] = useState<PositionValue>('pitcher')
  const [categoryFilter, setCategoryFilter] = useState<GearCategory>(null)
  const [detail, setDetail] = useState<{ product: RecommendedGearProduct; gearCategory: string } | null>(null)

  const { data: rows, error, isLoading } = useSWR(
    ['position_gear_recommendations', position],
    () => fetchRowsForPosition(position),
    { revalidateOnFocus: false },
  )

  const filteredRows = useMemo(() => {
    if (!rows?.length) return []
    if (!categoryFilter) return rows
    return rows.filter(r => r.gear_category === categoryFilter)
  }, [rows, categoryFilter])

  const currentLabel = POSITIONS.find(p => p.value === position)?.label ?? position

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <FadeIn>
        <div className="mb-10">
          <h1 className="font-heading text-4xl font-extrabold tracking-tight md:text-5xl">Gear Recommendations</h1>
          <p className="mt-3 max-w-2xl text-text-secondary">
            For each position and gear category, we list{' '}
            <span className="font-medium text-text-primary">up to five AI-ranked</span> picks — what our models surface first
            so you can compare gloves, bats, cleats, and helmets without endless scrolling. Click a card for the full
            recommendation notes; open the retailer only when you are ready.
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-6">
          {POSITIONS.map(tab => {
            const active = position === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setPosition(tab.value)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-accent/15 text-accent ring-1 ring-accent/35'
                    : 'bg-surface text-text-secondary ring-1 ring-border hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="mb-10">
          <label htmlFor="gear-category-filter" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Gear category
          </label>
          <div className="relative max-w-xs">
            <select
              id="gear-category-filter"
              value={categoryFilter ?? ''}
              onChange={e => {
                const v = e.target.value
                setCategoryFilter(v === '' ? null : (v as Exclude<GearCategory, null>))
              }}
              className="w-full appearance-none rounded-lg border border-border bg-surface py-2.5 pl-3 pr-9 text-sm font-semibold text-text-primary transition-colors hover:border-border-hover focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/25"
            >
              <option value="">All categories</option>
              {GEAR_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </FadeIn>

      {isLoading && (
        <div className="glass-card flex min-h-[280px] items-center justify-center animate-pulse">
          <p className="text-text-muted">Loading recommendations…</p>
        </div>
      )}

      {error && (
        <div className="glass-card p-8 text-center">
          <p className="text-text-secondary">
            Could not load recommendations. Check your Supabase URL, anon key, and RLS policies for{' '}
            <code className="text-accent">position_gear_recommendations</code>.
          </p>
        </div>
      )}

      {!isLoading && !error && filteredRows.length === 0 && (
        <div className="glass-card p-8 text-center">
          <p className="text-text-secondary">
            No recommendations for {currentLabel} with the current filter. Try another category or tab.
          </p>
        </div>
      )}

      {!isLoading && !error && filteredRows.length > 0 && (
        <div className="space-y-14">
          {filteredRows.map(row => {
            const products = parseRecommendedProducts(row.recommended_products)
            if (products.length === 0) return null

            return (
              <FadeInOnScroll key={row.id}>
                <div>
                  <h2 className="font-heading text-xl font-bold text-text-primary md:text-2xl">{row.gear_category}</h2>
                  <p className="mt-1 text-sm text-text-muted">{row.position_label}</p>
                  <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((product, i) => (
                      <ProductCard
                        key={`${row.id}-${product.product_name}-${i}`}
                        product={product}
                        gearCategory={row.gear_category}
                        onOpen={() => setDetail({ product, gearCategory: row.gear_category })}
                      />
                    ))}
                  </div>
                </div>
              </FadeInOnScroll>
            )
          })}
        </div>
      )}

      {detail ? (
        <GearProductDetailModal
          product={detail.product}
          gearCategory={detail.gearCategory}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </div>
  )
}
