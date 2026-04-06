'use client'

import { Suspense, startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { GameSnapshot } from '@/types'
import { isFinalStatus } from '@/lib/mlb-game'
import { FadeIn, FadeInOnScroll, StaggerContainer, StaggerItem } from '@/components/MotionWrapper'
import LiveGameCard from '@/components/mlb/LiveGameCard'
import ScheduledGameCard from '@/components/mlb/ScheduledGameCard'
import FinalGameCard from '@/components/mlb/FinalGameCard'
import GameDetailModal from '@/components/mlb/GameDetailModal'
import PlayerDetailModal from '@/components/mlb/PlayerDetailModal'

const VANCOUVER_TZ = 'America/Vancouver'
const REFRESH_MS = 15 * 60 * 1000
const FINAL_HISTORY_DAYS = 60

function getTodayDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: VANCOUVER_TZ }) // YYYY-MM-DD
}

function getTomorrowDateString(): string {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return tomorrow.toLocaleDateString('en-CA', { timeZone: VANCOUVER_TZ })
}

function ymdDaysAgoVancouver(days: number): string {
  const ms = Date.now() - days * 24 * 60 * 60 * 1000
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: VANCOUVER_TZ })
}

function formatFinalDateLabel(ymd: string): string {
  const anchor = new Date(`${ymd}T12:00:00Z`)
  return anchor.toLocaleDateString('en-US', {
    timeZone: VANCOUVER_TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function normalizeTeamSearchQuery(raw: string): string {
  return raw.trim().toLowerCase()
}

function gameMatchesTeamSearch(game: GameSnapshot, q: string): boolean {
  if (!q) return true
  const a = game.away_team.toLowerCase()
  const h = game.home_team.toLowerCase()
  return a.includes(q) || h.includes(q)
}

/** Latest row per game_pk (by updated_at). */
function dedupeLatestByGamePk(rows: GameSnapshot[]): GameSnapshot[] {
  const map = new Map<number, GameSnapshot>()
  for (const g of rows) {
    const prev = map.get(g.game_pk)
    if (!prev || new Date(g.updated_at) > new Date(prev.updated_at)) map.set(g.game_pk, g)
  }
  return [...map.values()]
}

function MLBPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [games, setGames] = useState<GameSnapshot[]>([])
  const [finalGamesAll, setFinalGamesAll] = useState<GameSnapshot[]>([])
  const [selectedFinalDate, setSelectedFinalDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [finalsLoading, setFinalsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<GameSnapshot | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)
  const [teamSearch, setTeamSearch] = useState('')

  const fetchGames = useCallback(async () => {
    try {
      const today = getTodayDateString()
      const tomorrow = getTomorrowDateString()
      const { data, error: fetchError } = await supabase
        .from('game_snapshots')
        .select('*')
        .or(`game_date.eq.${today},and(updated_at.gte.${today}T00:00:00,updated_at.lt.${tomorrow}T00:00:00)`)
        .order('updated_at', { ascending: false })

      if (fetchError) throw fetchError
      setGames((data ?? []) as GameSnapshot[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load games')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchFinalGames = useCallback(async () => {
    try {
      const today = getTodayDateString()
      const startStr = ymdDaysAgoVancouver(FINAL_HISTORY_DAYS)
      const { data, error: fetchError } = await supabase
        .from('game_snapshots')
        .select('*')
        .not('game_date', 'is', null)
        .gte('game_date', startStr)
        .lte('game_date', today)
        .order('updated_at', { ascending: false })

      if (fetchError) throw fetchError
      const rows = (data ?? []) as GameSnapshot[]
      const finals = dedupeLatestByGamePk(rows).filter(
        g => g.game_date && isFinalStatus(g.status),
      )
      finals.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )
      setFinalGamesAll(finals)
    } catch {
      setFinalGamesAll([])
    } finally {
      setFinalsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGames()
    fetchFinalGames()
    const interval = setInterval(() => {
      fetchGames()
      fetchFinalGames()
    }, REFRESH_MS)
    return () => clearInterval(interval)
  }, [fetchGames, fetchFinalGames])

  const finalDatesDesc = useMemo(() => {
    const set = new Set<string>()
    for (const g of finalGamesAll) {
      if (g.game_date) set.add(g.game_date)
    }
    return [...set].sort().reverse()
  }, [finalGamesAll])

  useEffect(() => {
    if (finalDatesDesc.length === 0) {
      setSelectedFinalDate(null)
      return
    }
    setSelectedFinalDate(prev => (prev && finalDatesDesc.includes(prev) ? prev : finalDatesDesc[0]))
  }, [finalDatesDesc])

  const finalGamesForSelectedDate = useMemo(() => {
    if (!selectedFinalDate) return []
    return finalGamesAll
      .filter(g => g.game_date === selectedFinalDate)
      .slice()
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )
  }, [finalGamesAll, selectedFinalDate])

  const liveGames = games.filter(g => g.status === 'Live')
  const scheduledGames = games.filter(g => g.status === 'Scheduled')

  const teamSearchNorm = useMemo(() => normalizeTeamSearchQuery(teamSearch), [teamSearch])

  const liveGamesFiltered = useMemo(
    () => liveGames.filter(g => gameMatchesTeamSearch(g, teamSearchNorm)),
    [liveGames, teamSearchNorm],
  )
  const scheduledGamesFiltered = useMemo(
    () => scheduledGames.filter(g => gameMatchesTeamSearch(g, teamSearchNorm)),
    [scheduledGames, teamSearchNorm],
  )
  const finalGamesForDateFiltered = useMemo(
    () => finalGamesForSelectedDate.filter(g => gameMatchesTeamSearch(g, teamSearchNorm)),
    [finalGamesForSelectedDate, teamSearchNorm],
  )

  const gamesByPk = useMemo(() => {
    const merged = dedupeLatestByGamePk([...games, ...finalGamesAll])
    return new Map(merged.map(g => [g.game_pk, g]))
  }, [games, finalGamesAll])

  const gameFromQuery = searchParams.get('game')
  useEffect(() => {
    if (gameFromQuery == null || gameFromQuery === '') return
    const pk = Number.parseInt(gameFromQuery, 10)
    if (!Number.isFinite(pk) || pk < 1) {
      router.replace('/mlb', { scroll: false })
      return
    }

    const fromList = gamesByPk.get(pk)
    if (fromList) {
      startTransition(() => setSelectedGame(fromList))
      router.replace('/mlb', { scroll: false })
      return
    }

    if (loading || finalsLoading) return

    let cancelled = false
    void (async () => {
      const { data: row, error: rowError } = await supabase
        .from('game_snapshots')
        .select('*')
        .eq('game_pk', pk)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return
      if (rowError || !row) {
        router.replace('/mlb', { scroll: false })
        return
      }
      startTransition(() => setSelectedGame(row as GameSnapshot))
      router.replace('/mlb', { scroll: false })
    })()

    return () => {
      cancelled = true
    }
  }, [gameFromQuery, gamesByPk, loading, finalsLoading, router])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f1117' }}>
      <div className="mx-auto max-w-screen-2xl px-6 py-12 sm:px-8 lg:px-10">
        <FadeIn>
          <div className="mb-12">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1 text-xs font-medium text-[#22c55e]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              Auto-refresh every 15 minutes
            </div>
            <h1 className="font-heading text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              MLB Real-time Win Probability
            </h1>
            <p className="mt-3 max-w-lg text-[#94a3b8]">
              Check real-time scores and win probability for today&apos;s games.
            </p>
            <div className="mt-6 max-w-md">
              <label htmlFor="mlb-team-search" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[#64748b]">
                Filter by team
              </label>
              <input
                id="mlb-team-search"
                type="search"
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                placeholder="e.g. LAD, NYY, SF…"
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-[#1a1f2e] px-4 py-2.5 text-sm text-white placeholder:text-[#64748b] transition-colors focus:border-[#22c55e]/40 focus:outline-none focus:ring-1 focus:ring-[#22c55e]/30"
              />
              {teamSearchNorm ? (
                <p className="mt-2 text-xs text-[#64748b]">
                  Showing games where away or home team code contains &quot;{teamSearch.trim()}&quot;.
                </p>
              ) : null}
            </div>
          </div>
        </FadeIn>

        {loading && (
          <div className="space-y-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 md:gap-8">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl"
                  style={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div
            className="rounded-xl p-8 text-center"
            style={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-[#94a3b8]">
              Failed to load data. Please check Supabase connection.
            </p>
            <p className="mt-2 text-sm text-[#64748b]">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {liveGames.length > 0 && (
              <FadeInOnScroll>
                <h2 className="mb-5 font-heading text-2xl font-bold text-white">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#22c55e] animate-pulse" />
                  Live Games
                </h2>
                {liveGamesFiltered.length === 0 ? (
                  <p className="mb-12 text-sm text-[#94a3b8]">
                    No live games match this team filter. Clear the search to see all {liveGames.length} live game
                    {liveGames.length === 1 ? '' : 's'}.
                  </p>
                ) : (
                  <StaggerContainer className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 md:gap-8">
                    {liveGamesFiltered.map(game => (
                      <StaggerItem key={game.game_pk}>
                        <LiveGameCard game={game} onOpen={() => setSelectedGame(game)} />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                )}
              </FadeInOnScroll>
            )}

            {scheduledGames.length > 0 && (
              <FadeInOnScroll>
                <h2 className="mb-5 font-heading text-2xl font-bold text-white">
                  Upcoming & Scheduled
                </h2>
                {scheduledGamesFiltered.length === 0 ? (
                  <p className="mb-12 text-sm text-[#94a3b8]">
                    No scheduled games match this team filter. Clear the search to see all {scheduledGames.length}{' '}
                    game{scheduledGames.length === 1 ? '' : 's'}.
                  </p>
                ) : (
                  <StaggerContainer className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 md:gap-8">
                    {scheduledGamesFiltered.map(game => (
                      <StaggerItem key={game.game_pk}>
                        <ScheduledGameCard game={game} onOpen={() => setSelectedGame(game)} />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                )}
              </FadeInOnScroll>
            )}

            {!finalsLoading && finalDatesDesc.length > 0 && (
              <FadeInOnScroll>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <h2 className="font-heading text-2xl font-bold text-white">Final</h2>
                  <div className="relative max-w-sm">
                    <label htmlFor="mlb-final-date" className="sr-only">
                      Final games by date
                    </label>
                    <select
                      id="mlb-final-date"
                      value={selectedFinalDate ?? finalDatesDesc[0]}
                      onChange={e => setSelectedFinalDate(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-white/10 bg-[#1a1f2e] px-4 py-3 pr-9 text-base font-medium text-white transition-colors hover:border-[#22c55e]/35 focus:border-[#22c55e]/50 focus:outline-none"
                    >
                      {finalDatesDesc.map(d => (
                        <option key={d} value={d}>
                          {formatFinalDateLabel(d)} — {d}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"
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
                {finalGamesForDateFiltered.length === 0 ? (
                  <p className="mb-12 text-sm text-[#94a3b8]">
                    No final games on this date match this team filter. Clear the search or pick another date (
                    {finalGamesForSelectedDate.length} game{finalGamesForSelectedDate.length === 1 ? '' : 's'} hidden).
                  </p>
                ) : (
                  <StaggerContainer className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3 md:gap-8">
                    {finalGamesForDateFiltered.map(game => (
                      <StaggerItem key={game.game_pk}>
                        <FinalGameCard game={game} onOpen={() => setSelectedGame(game)} />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                )}
              </FadeInOnScroll>
            )}

            {!finalsLoading &&
              finalDatesDesc.length === 0 &&
              liveGames.length === 0 &&
              scheduledGames.length === 0 && (
                <FadeInOnScroll>
                  <div
                    className="rounded-xl p-12 text-center"
                    style={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <p className="text-[#94a3b8]">No live or scheduled games today.</p>
                    <p className="mt-2 text-sm text-[#64748b]">
                      No final scores in the last {FINAL_HISTORY_DAYS} days (Vancouver date range).
                    </p>
                  </div>
                </FadeInOnScroll>
              )}
          </>
        )}
      </div>

      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          onClose={() => {
            setSelectedGame(null)
            setSelectedPlayerId(null)
          }}
          onPlayerClick={id => setSelectedPlayerId(id)}
        />
      )}
      {selectedPlayerId != null && (
        <PlayerDetailModal
          playerId={selectedPlayerId}
          gamePk={selectedGame?.game_pk ?? null}
          onClose={() => setSelectedPlayerId(null)}
          onBack={selectedGame ? () => setSelectedPlayerId(null) : undefined}
        />
      )}
    </div>
  )
}

export default function MLBPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: '#0f1117' }} />}>
      <MLBPageInner />
    </Suspense>
  )
}
