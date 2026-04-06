'use client'

import { Suspense, startTransition, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import type { DashboardData, PlayerSearchResult } from '@/types'
import { loadDashboardDataFromSupabase, searchPlayersSupabase } from '@/lib/dashboard-supabase'
import { fetchSeasonHitters, fetchSeasonPitchers, type HitterRow, type PitcherRow } from '@/lib/season-stats'
import DashboardLeaderboardTables from '@/components/DashboardLeaderboardTables'
import Season2026LeaderboardTables from '@/components/Season2026LeaderboardTables'
import PlayerDetailModal from '@/components/mlb/PlayerDetailModal'
import PlayerSearchResults from '@/components/PlayerSearchResults'
import { FadeInOnScroll } from '@/components/MotionWrapper'

type SearchResponse = { results: PlayerSearchResult[] }
type Season2026Data = { hitters: HitterRow[]; pitchers: PitcherRow[] }

const DASHBOARD_SWR_KEY = 'dashboard:supabase'
const SEASON_2026_SWR_KEY = 'dashboard:2026'

function leaderboardsAllEmpty(data: DashboardData): boolean {
  const lb = data.leaderboards
  if (!lb) return true
  return (
    lb.hitters.byHomeRuns.length === 0 &&
    lb.hitters.byAvg.length === 0 &&
    lb.hitters.byOps.length === 0 &&
    lb.pitchers.byEra.length === 0 &&
    lb.pitchers.byStrikeouts.length === 0 &&
    lb.pitchers.byWhip.length === 0
  )
}

// ─── Season selector pill group ───────────────────────────────────────────────

function SeasonSelector({
  value,
  onChange,
}: {
  value: 2025 | 2026
  onChange: (s: 2025 | 2026) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Season</span>
      <div className="flex gap-0.5 rounded-lg border border-border bg-surface p-0.5">
        {([2025, 2026] as const).map(y => (
          <button
            key={y}
            type="button"
            onClick={() => onChange(y)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-all ${
              value === y
                ? 'bg-accent text-white shadow-sm shadow-accent/20'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {y}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── 2026 loading skeleton ─────────────────────────────────────────────────────

function Skeleton2026() {
  return (
    <div className="space-y-8">
      {[0, 1].map(s => (
        <section key={s}>
          <div className="mb-3 flex items-end justify-between">
            <div className="space-y-1.5">
              <div className="h-5 w-24 animate-pulse rounded bg-surface" />
              <div className="h-3 w-56 animate-pulse rounded bg-surface" />
            </div>
            <div className="h-8 w-48 animate-pulse rounded-lg bg-surface" />
          </div>
          <div className="glass-card overflow-hidden">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border/30 px-4 py-3 last:border-0">
                <div className="h-3 w-4 animate-pulse rounded bg-surface" />
                <div className="h-4 w-36 animate-pulse rounded bg-surface" />
                <div className="ml-auto h-3 w-8 animate-pulse rounded bg-surface" />
                <div className="h-3 w-8 animate-pulse rounded bg-surface" />
                <div className="h-3 w-10 animate-pulse rounded bg-surface" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

// ─── Main page inner ──────────────────────────────────────────────────────────

function DashboardPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [playerSearch, setPlayerSearch] = useState('')
  const [selectedSeason, setSelectedSeason] = useState<2025 | 2026>(2025)

  // 모달: 단일 PlayerDetailModal로 통일 (initialSeason 으로 2025/2026 구분)
  const [detailPlayerId, setDetailPlayerId] = useState<number | null>(null)
  const [detailSeason, setDetailSeason] = useState<2025 | 2026>(2025)
  const [detailReturnGamePk, setDetailReturnGamePk] = useState<number | null>(null)

  function openPlayer(id: number, season: 2025 | 2026, returnPk: number | null = null) {
    setDetailPlayerId(id)
    setDetailSeason(season)
    setDetailReturnGamePk(returnPk)
  }

  // URL query: ?player=xxx&gamePk=xxx from MLB Live
  const playerFromQuery = searchParams.get('player')
  const gamePkFromQuery = searchParams.get('gamePk')
  useEffect(() => {
    if (playerFromQuery == null || playerFromQuery === '') return
    const id = Number.parseInt(playerFromQuery, 10)
    if (!Number.isFinite(id) || id < 1) {
      router.replace('/dashboard', { scroll: false })
      return
    }
    let returnPk: number | null = null
    if (gamePkFromQuery != null && gamePkFromQuery !== '') {
      const g = Number.parseInt(gamePkFromQuery, 10)
      if (Number.isFinite(g) && g >= 1) returnPk = g
    }
    startTransition(() => {
      openPlayer(id, 2026, returnPk)
    })
    router.replace('/dashboard', { scroll: false })
  }, [playerFromQuery, gamePkFromQuery, router])

  // ── 2025 data (player_stats table) ──────────────────────────────────────────
  const { data, error, isLoading } = useSWR<DashboardData>(
    DASHBOARD_SWR_KEY,
    () => loadDashboardDataFromSupabase(),
    { refreshInterval: 1000 * 60 }
  )

  // ── 2026 data (game_boxscores aggregated) — only fetched when tab is active ──
  const { data: data2026, isLoading: loading2026, error: error2026 } = useSWR<Season2026Data>(
    selectedSeason === 2026 ? SEASON_2026_SWR_KEY : null,
    async () => {
      const [hitters, pitchers] = await Promise.all([fetchSeasonHitters(5), fetchSeasonPitchers(3)])
      return { hitters, pitchers }
    },
    { refreshInterval: 1000 * 60 * 5 }
  )

  // ── Player search ────────────────────────────────────────────────────────────
  const searchQuery = playerSearch.trim()
  const searchActive = searchQuery.length >= 2

  const searchKey = useMemo(() => {
    if (!searchActive) return null
    return ['player-search', searchQuery] as const
  }, [searchActive, searchQuery])

  const { data: searchData, isLoading: searchLoading } = useSWR<SearchResponse>(
    searchKey,
    async ([, q]: readonly ['player-search', string]) => ({ results: await searchPlayersSupabase(q) }),
    { revalidateOnFocus: false }
  )

  const searchResults = searchData?.results ?? []
  const noPlayerData = data && !searchActive && leaderboardsAllEmpty(data)

  const subtitle2025 = data
    ? `Season 2025 · player_stats + team_rosters · min ${data.leaderboards.minHitterAb} AB / ${data.leaderboards.minPitcherIp} IP · Top 10`
    : 'Season 2025 · Loading…'

  const subtitle2026 = `Season 2026 · game_boxscores (from Mar 25) · min 5 AB / 3 IP · Top 10`

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* ── Initial 2025 load skeleton ── */}
      {isLoading && selectedSeason === 2025 && (
        <div className="glass-card h-96 animate-pulse bg-surface" />
      )}

      {error && selectedSeason === 2025 && (
        <div className="glass-card p-8 text-center">
          <p className="text-text-secondary">
            Could not load 2025 data. Check{' '}
            <code className="rounded bg-surface px-1">NEXT_PUBLIC_SUPABASE_URL</code> /{' '}
            <code className="rounded bg-surface px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      )}

      {(!isLoading || selectedSeason === 2026) && (
        <FadeInOnScroll>
          <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text-primary md:text-4xl">
                  Top Players
                </h1>
                <p className="mt-2 text-sm text-text-secondary">
                  {selectedSeason === 2025 ? subtitle2025 : subtitle2026}
                  {selectedSeason === 2025 ? ' · Search rosters by name (2+ chars)' : ''}
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 sm:items-end">
                <SeasonSelector value={selectedSeason} onChange={setSelectedSeason} />
                {/* Search — only shown for 2025 (player_stats has full roster; 2026 data is leaderboard-only) */}
                {selectedSeason === 2025 && (
                  <label className="block w-full sm:w-72">
                    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
                      Search players
                    </span>
                    <input
                      type="search"
                      value={playerSearch}
                      onChange={e => setPlayerSearch(e.target.value)}
                      placeholder="e.g. Judge, Cole…"
                      autoComplete="off"
                      className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* ── 2025 leaderboards ── */}
            {selectedSeason === 2025 && data && (
              <>
                {searchActive ? (
                  <PlayerSearchResults
                    results={searchResults}
                    loading={searchLoading}
                    query={searchQuery}
                    onSelectPlayer={r => openPlayer(r.player_id, 2025)}
                  />
                ) : noPlayerData ? (
                  <div className="glass-card border border-dashed border-border p-8 text-center">
                    <p className="text-sm font-medium text-text-primary">
                      No leaderboard data (season {data.leaderboards.season})
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      Confirm <code className="rounded bg-surface px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> +{' '}
                      <code className="rounded bg-surface px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set.
                      If <code className="rounded bg-surface px-1.5 py-0.5 text-xs">player_stats.season</code> isn&apos;t 2025,
                      set <code className="rounded bg-surface px-1.5 py-0.5 text-xs">NEXT_PUBLIC_DASHBOARD_SEASON=2025</code> in{' '}
                      <code className="rounded bg-surface px-1.5 py-0.5 text-xs">.env.local</code>.
                    </p>
                  </div>
                ) : (
                  <DashboardLeaderboardTables
                    data={data.leaderboards}
                    onSelectPlayer={p => openPlayer(p.player_id, 2025)}
                  />
                )}
              </>
            )}

            {/* ── 2026 leaderboards ── */}
            {selectedSeason === 2026 && (
              <>
                {error2026 && (
                  <div className="glass-card p-6 text-center">
                    <p className="text-sm text-red-400">{error2026 instanceof Error ? error2026.message : 'Failed to load 2026 data'}</p>
                  </div>
                )}
                {loading2026 && !data2026 ? (
                  <Skeleton2026 />
                ) : data2026 ? (
                  <Season2026LeaderboardTables
                    hitters={data2026.hitters}
                    pitchers={data2026.pitchers}
                    onSelectPlayer={id => openPlayer(id, 2026)}
                  />
                ) : null}
              </>
            )}
          </div>
        </FadeInOnScroll>
      )}

      {/* ── Player detail modal (2025 or 2026 based on which leaderboard was clicked) ── */}
      {detailPlayerId != null && (
        <PlayerDetailModal
          playerId={detailPlayerId}
          gamePk={detailReturnGamePk}
          initialSeason={detailSeason}
          onClose={() => {
            setDetailPlayerId(null)
            setDetailReturnGamePk(null)
          }}
        />
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="glass-card h-96 animate-pulse bg-surface" />
        </div>
      }
    >
      <DashboardPageInner />
    </Suspense>
  )
}
