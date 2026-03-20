'use client'

import { Suspense, startTransition, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import type { DashboardData, PlayerSearchResult } from '@/types'
import { loadDashboardDataFromSupabase, searchPlayersSupabase } from '@/lib/dashboard-supabase'
import DashboardLeaderboardTables from '@/components/DashboardLeaderboardTables'
import PlayerStatsChartModal from '@/components/PlayerStatsChartModal'
import PlayerSearchResults from '@/components/PlayerSearchResults'
import { FadeInOnScroll } from '@/components/MotionWrapper'

type SearchResponse = { results: PlayerSearchResult[] }

const DASHBOARD_SWR_KEY = 'dashboard:supabase'

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

function DashboardPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [playerSearch, setPlayerSearch] = useState('')
  const [chartPlayerId, setChartPlayerId] = useState<number | null>(null)
  /** Set when opening chart from MLB (`?gamePk=`) so we can jump back to that game modal. */
  const [chartReturnGamePk, setChartReturnGamePk] = useState<number | null>(null)

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
      setChartPlayerId(id)
      setChartReturnGamePk(returnPk)
    })
    router.replace('/dashboard', { scroll: false })
  }, [playerFromQuery, gamePkFromQuery, router])

  const { data, error, isLoading } = useSWR<DashboardData>(
    DASHBOARD_SWR_KEY,
    () => loadDashboardDataFromSupabase(),
    { refreshInterval: 1000 * 60 }
  )

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

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {isLoading && (
        <div className="glass-card h-96 animate-pulse bg-surface" />
      )}

      {error && (
        <div className="glass-card p-8 text-center">
          <p className="text-text-secondary">
            Could not load dashboard data. Check the browser console and your Supabase env (
            <code className="rounded bg-surface px-1">NEXT_PUBLIC_SUPABASE_URL</code> /{' '}
            <code className="rounded bg-surface px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>).
          </p>
        </div>
      )}

      {data && (
        <>
          <FadeInOnScroll>
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text-primary md:text-4xl">
                    Top Players
                  </h1>
                  <p className="mt-2 text-sm text-text-secondary">
                    Season <strong>{data.leaderboards.season}</strong> · Loaded directly from Supabase in the browser (
                    <code className="rounded bg-surface px-1">player_stats</code> +{' '}
                    <code className="rounded bg-surface px-1">team_rosters</code>, min {data.leaderboards.minHitterAb}{' '}
                    AB / {data.leaderboards.minPitcherIp} IP). Search rosters by name (2+ characters).
                  </p>
                </div>
                <label className="block w-full sm:max-w-md">
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
              </div>

              {searchActive ? (
                <PlayerSearchResults
                  results={searchResults}
                  loading={searchLoading}
                  query={searchQuery}
                  onSelectPlayer={r => {
                    setChartReturnGamePk(null)
                    setChartPlayerId(r.player_id)
                  }}
                />
              ) : noPlayerData ? (
                <div className="glass-card border border-dashed border-border p-8 text-center">
                  <p className="text-sm font-medium text-text-primary">
                    No leaderboard data (season {data.leaderboards.season})
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">
                    1) Confirm{' '}
                    <code className="rounded bg-surface px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> +{' '}
                    <code className="rounded bg-surface px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are
                    set for the client bundle. Check the browser Network/Console tabs for Supabase errors.
                  </p>
                  <p className="mt-3 text-sm text-text-secondary">
                    2) If <code className="rounded bg-surface px-1.5 py-0.5 text-xs">player_stats.season</code> is not{' '}
                    {data.leaderboards.season}, set e.g.{' '}
                    <code className="rounded bg-surface px-1.5 py-0.5 text-xs">NEXT_PUBLIC_DASHBOARD_SEASON=2026</code> in{' '}
                    <code className="rounded bg-surface px-1.5 py-0.5 text-xs">.env.local</code>.
                  </p>
                  <p className="mt-3 text-sm text-text-secondary">
                    3) If qualification cutoffs are too strict, temporarily lower them with{' '}
                    <code className="rounded bg-surface px-1.5 py-0.5 text-xs">
                      NEXT_PUBLIC_DASHBOARD_MIN_HITTER_AB=50
                    </code>{' '}
                    and/or{' '}
                    <code className="rounded bg-surface px-1.5 py-0.5 text-xs">
                      NEXT_PUBLIC_DASHBOARD_MIN_PITCHER_IP=10
                    </code>
                    , then restore 300 / 50 once you verify the data.
                  </p>
                </div>
              ) : (
                <DashboardLeaderboardTables
                  data={data.leaderboards}
                  onSelectPlayer={p => {
                    setChartReturnGamePk(null)
                    setChartPlayerId(p.player_id)
                  }}
                />
              )}
            </div>
          </FadeInOnScroll>
        </>
      )}

      {chartPlayerId != null && (
        <PlayerStatsChartModal
          playerId={chartPlayerId}
          returnGamePk={chartReturnGamePk}
          onClose={() => {
            setChartPlayerId(null)
            setChartReturnGamePk(null)
          }}
          onReturnToGame={
            chartReturnGamePk != null
              ? () => {
                  router.push(`/mlb?game=${chartReturnGamePk}`)
                  startTransition(() => {
                    setChartPlayerId(null)
                    setChartReturnGamePk(null)
                  })
                }
              : undefined
          }
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
