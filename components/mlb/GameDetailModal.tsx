'use client'

import { useEffect, useState, useMemo } from 'react'
import { getFinalOutcome, isFinalStatus } from '@/lib/mlb-game'
import { supabase } from '@/lib/supabase'
import type { GameSnapshot } from '@/types'
import type { TeamRosterRow, GameBoxscoreRow } from '@/types/mlb'
import MlbModal from './MlbModal'

interface Props {
  game: GameSnapshot
  onClose: () => void
  onPlayerClick: (playerId: number) => void
}

function rosterKey(r: TeamRosterRow) {
  return `${r.player_id}-${r.team_id}`
}

/** `game_snapshots` team code → `team_rosters.team_abbr` (add rows when they diverge). */
const TEAM_ABBR_MAP: Record<string, string> = {
  ARI: 'AZ',
  // 추가 불일치 발견시 여기에 추가
}

function toRosterTeamAbbr(snapshotAbbr: string): string {
  return TEAM_ABBR_MAP[snapshotAbbr] ?? snapshotAbbr
}

/** Display game status in English (handles mixed DB values). Korean keys use \\u escapes (ASCII-only source). */
function gameStatusEn(status: string): string {
  const s = status?.trim() ?? ''
  const map: Record<string, string> = {
    Live: 'Live',
    Scheduled: 'Scheduled',
    Final: 'Final',
    Cancelled: 'Cancelled',
    Canceled: 'Canceled',
    Postponed: 'Postponed',
    InProgress: 'Live',
    Pregame: 'Scheduled',
    PreGame: 'Scheduled',
    Warmup: 'Scheduled',
    Preview: 'Scheduled',
    // Korean API values (\u escapes)
    '\uC9C4\uD589': 'Live',
    '\uC9C4\uD589\uC911': 'Live',
    '\uC9C4\uD589 \uC911': 'Live',
    '\uC608\uC815': 'Scheduled',
    '\uC885\uB8CC': 'Final',
    '\uCDE8\uC18C': 'Cancelled',
    '\uC5F0\uAE30': 'Postponed',
  }
  return map[s] ?? s
}

/** DISTINCT(team_id, team_abbr) equivalent: first team_id wins per abbreviation. */
function teamIdByAbbrFromRosterRows(rows: { team_id?: number | null; team_abbr?: string | null }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const abbr = r.team_abbr?.trim()
    const tid = r.team_id
    if (!abbr || tid == null || !Number.isFinite(Number(tid))) continue
    if (out[abbr] === undefined) out[abbr] = Number(tid)
  }
  return out
}

const ROSTER_PAGE_LIMIT = 3000
const PLAYER_ID_CHUNK = 100
/** Headroom for multiple `team_rosters` rows per player (seasons / roster types). PK is (player_id, team_id). */
const ROSTER_FETCH_ROWS_PER_PLAYER = 12

function teamIdFromBoxForPlayer(boxRows: GameBoxscoreRow[], playerId: number): number | null {
  for (const b of boxRows) {
    if (b.player_id !== playerId) continue
    const tid = b.team_id
    if (tid != null && Number.isFinite(Number(tid))) return Number(tid)
  }
  return null
}

/**
 * Merge roster rows for boxscore players not in `initial`. `team_rosters` can have multiple rows per
 * `player_id` (trades, seasons); match `game_boxscores.team_id` when choosing a row, else first row.
 */
async function mergeRostersForBoxscorePlayers(
  boxRows: GameBoxscoreRow[],
  initial: TeamRosterRow[],
  cancelled: () => boolean
): Promise<TeamRosterRow[]> {
  const byId = new Map<number, TeamRosterRow>()
  for (const r of initial) {
    byId.set(r.player_id, r)
  }
  const neededIds = [...new Set(boxRows.map(b => b.player_id))]
  const missing = neededIds.filter(id => !byId.has(id))
  for (let i = 0; i < missing.length; i += PLAYER_ID_CHUNK) {
    if (cancelled()) break
    const slice = missing.slice(i, i + PLAYER_ID_CHUNK)
    const rowCap = Math.min(2000, slice.length * ROSTER_FETCH_ROWS_PER_PLAYER)
    const { data, error } = await supabase.from('team_rosters').select('*').in('player_id', slice).limit(rowCap)
    if (error) throw error
    const fetched = (data ?? []) as TeamRosterRow[]
    const byPlayer = new Map<number, TeamRosterRow[]>()
    for (const r of fetched) {
      const list = byPlayer.get(r.player_id) ?? []
      list.push(r)
      byPlayer.set(r.player_id, list)
    }
    for (const pid of slice) {
      const candidates = byPlayer.get(pid)
      if (!candidates?.length) continue
      const boxTid = teamIdFromBoxForPlayer(boxRows, pid)
      const picked =
        boxTid != null ? candidates.find(r => r.team_id === boxTid) ?? candidates[0] : candidates[0]
      byId.set(pid, picked)
    }
  }
  return [...byId.values()]
}

const MLB_PEOPLE_BATCH = 50

type MlbPeopleResponse = {
  people?: { id?: number; fullName?: string }[]
}

/** https://statsapi.mlb.com/api/v1/people?personIds=…&fields=people,id,fullName */
async function fetchMlbPeopleFullNames(personIds: number[]): Promise<Record<number, string>> {
  if (personIds.length === 0) return {}
  const params = new URLSearchParams({
    personIds: personIds.join(','),
    fields: 'people,id,fullName',
  })
  const res = await fetch(`https://statsapi.mlb.com/api/v1/people?${params}`)
  if (!res.ok) return {}
  const data = (await res.json()) as MlbPeopleResponse
  const out: Record<number, string> = {}
  for (const p of data.people ?? []) {
    const id = p.id
    const name = p.fullName?.trim()
    if (id != null && Number.isFinite(id) && name) out[id] = name
  }
  return out
}

async function fetchMlbNamesForPlayerIds(
  personIds: number[],
  cancelled: () => boolean
): Promise<Record<number, string>> {
  const merged: Record<number, string> = {}
  for (let i = 0; i < personIds.length; i += MLB_PEOPLE_BATCH) {
    if (cancelled()) break
    const slice = personIds.slice(i, i + MLB_PEOPLE_BATCH)
    try {
      const part = await fetchMlbPeopleFullNames(slice)
      Object.assign(merged, part)
    } catch {
      /* one batch failure should not block others */
    }
  }
  return merged
}

/** When only one side resolved from abbr→id map, infer the other MLB `team_id` from distinct boxscore rows. */
function resolveHomeAwayTeamIds(
  boxRows: GameBoxscoreRow[],
  game: GameSnapshot,
  abbrMap: Record<string, number>
): { away: number | null; home: number | null } {
  let awayTid: number | null = game.away_team_id ?? abbrMap[toRosterTeamAbbr(game.away_team)] ?? null
  let homeTid: number | null = game.home_team_id ?? abbrMap[toRosterTeamAbbr(game.home_team)] ?? null
  const fromBox = [
    ...new Set(
      boxRows.map(b => b.team_id).filter((id): id is number => id != null && Number.isFinite(Number(id)))
    ),
  ]
  if (fromBox.length === 2) {
    if (awayTid != null && homeTid == null) {
      homeTid = fromBox.find(id => id !== awayTid) ?? null
    } else if (homeTid != null && awayTid == null) {
      awayTid = fromBox.find(id => id !== homeTid) ?? null
    }
  }
  return { away: awayTid, home: homeTid }
}

async function fetchTeamIdRowsForAbbrs(abbrs: string[]): Promise<{ data: { team_id: number; team_abbr: string }[]; error: Error | null }> {
  if (abbrs.length === 0) return { data: [], error: null }
  const results = await Promise.all(
    abbrs.map(abbr =>
      supabase.from('team_rosters').select('team_id, team_abbr').eq('team_abbr', abbr).limit(100)
    )
  )
  for (const r of results) {
    if (r.error) return { data: [], error: r.error }
  }
  return { data: results.flatMap(r => (r.data ?? []) as { team_id: number; team_abbr: string }[]), error: null }
}

async function fetchRosterRowsForGame(game: GameSnapshot): Promise<{ data: TeamRosterRow[]; error: Error | null }> {
  const abbrs = [...new Set([toRosterTeamAbbr(game.away_team), toRosterTeamAbbr(game.home_team)].filter(Boolean))]
  const homeId = game.home_team_id
  const awayId = game.away_team_id

  if (homeId != null && awayId != null) {
    const [awayR, homeR] = await Promise.all([
      supabase.from('team_rosters').select('*').eq('team_id', awayId).limit(ROSTER_PAGE_LIMIT),
      supabase.from('team_rosters').select('*').eq('team_id', homeId).limit(ROSTER_PAGE_LIMIT),
    ])
    if (awayR.error) return { data: [], error: awayR.error }
    if (homeR.error) return { data: [], error: homeR.error }
    return {
      data: [...(awayR.data ?? []), ...(homeR.data ?? [])] as TeamRosterRow[],
      error: null,
    }
  }

  if (abbrs.length === 0) return { data: [], error: null }

  const results = await Promise.all(
    abbrs.map(abbr => supabase.from('team_rosters').select('*').eq('team_abbr', abbr).limit(ROSTER_PAGE_LIMIT))
  )
  for (const r of results) {
    if (r.error) return { data: [], error: r.error }
  }
  return { data: results.flatMap(r => (r.data ?? []) as TeamRosterRow[]), error: null }
}

function rosterHasTeamId(rows: TeamRosterRow[], tid: number | null): boolean {
  if (tid == null) return false
  return rows.some(r => r.team_id === tid)
}

async function mergeRosterRowsByTeamId(
  rows: TeamRosterRow[],
  tid: number | null,
  cancelled: () => boolean
): Promise<TeamRosterRow[]> {
  if (tid == null || cancelled() || rosterHasTeamId(rows, tid)) return rows
  const { data, error } = await supabase.from('team_rosters').select('*').eq('team_id', tid).limit(ROSTER_PAGE_LIMIT)
  if (error || cancelled()) return rows
  const byKey = new Map<string, TeamRosterRow>()
  for (const r of rows) {
    byKey.set(rosterKey(r), r)
  }
  for (const r of (data ?? []) as TeamRosterRow[]) {
    byKey.set(rosterKey(r), r)
  }
  return [...byKey.values()]
}

/** Boxscore player_ids that still need a display name after roster (non-empty full_name) lookup. */
function playerIdsMissingRosterName(boxRows: GameBoxscoreRow[], rosterRows: TeamRosterRow[]): number[] {
  const rosterHasName = new Set<number>()
  for (const r of rosterRows) {
    if (r.full_name?.trim()) rosterHasName.add(r.player_id)
  }
  const need = new Set<number>()
  for (const b of boxRows) {
    if (!rosterHasName.has(b.player_id)) need.add(b.player_id)
  }
  return [...need]
}

export default function GameDetailModal({ game, onClose, onPlayerClick }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rosters, setRosters] = useState<TeamRosterRow[]>([])
  const [boxscores, setBoxscores] = useState<GameBoxscoreRow[]>([])
  /** Resolved MLB team ids for home/away (abbr map + boxscore backfill when snapshot abbr ≠ roster abbr). */
  const [resolvedGameTeamIds, setResolvedGameTeamIds] = useState<{ away: number | null; home: number | null }>({
    away: null,
    home: null,
  })
  /** Names from MLB Stats API for players missing from `team_rosters` (e.g. spring roster gaps). */
  const [mlbNameByPlayerId, setMlbNameByPlayerId] = useState<Record<number, string>>({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      setResolvedGameTeamIds({ away: null, home: null })
      setMlbNameByPlayerId({})
      try {
        const rosterAbbrs = [...new Set([toRosterTeamAbbr(game.away_team), toRosterTeamAbbr(game.home_team)].filter(Boolean))]

        const [boxRes, rosterOut, teamMapOut] = await Promise.all([
          supabase
            .from('game_boxscores')
            .select('*')
            .eq('game_pk', game.game_pk)
            // PostgREST default max rows can cap below full box score; one game needs headroom for both teams × two stat groups.
            .limit(500),
          fetchRosterRowsForGame(game),
          fetchTeamIdRowsForAbbrs(rosterAbbrs),
        ])

        if (boxRes.error) throw boxRes.error
        if (rosterOut.error) throw rosterOut.error
        if (teamMapOut.error) throw teamMapOut.error
        if (cancelled) return
        const boxRows = (boxRes.data ?? []) as GameBoxscoreRow[]
        const abbrMap = teamIdByAbbrFromRosterRows(teamMapOut.data ?? [])
        const teamIds = resolveHomeAwayTeamIds(boxRows, game, abbrMap)
        let rosterRows = rosterOut.data
        rosterRows = await mergeRostersForBoxscorePlayers(boxRows, rosterRows, () => cancelled)
        if (cancelled) return
        rosterRows = await mergeRosterRowsByTeamId(rosterRows, teamIds.away, () => cancelled)
        rosterRows = await mergeRosterRowsByTeamId(rosterRows, teamIds.home, () => cancelled)
        if (cancelled) return
        const missingNameIds = playerIdsMissingRosterName(boxRows, rosterRows)
        const mlbNames =
          missingNameIds.length > 0 ? await fetchMlbNamesForPlayerIds(missingNameIds, () => cancelled) : {}
        if (cancelled) return
        setBoxscores(boxRows)
        setRosters(rosterRows)
        setResolvedGameTeamIds(teamIds)
        setMlbNameByPlayerId(mlbNames)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [game])

  const nameByPlayerId = useMemo(() => {
    const m = new Map<number, string>()
    for (const r of rosters) {
      const name = r.full_name?.trim()
      if (name) m.set(r.player_id, name)
    }
    for (const [key, name] of Object.entries(mlbNameByPlayerId)) {
      const id = Number(key)
      if (!Number.isFinite(id) || !name?.trim()) continue
      if (!m.has(id)) m.set(id, name.trim())
    }
    return m
  }, [rosters, mlbNameByPlayerId])

  const posByPlayerId = useMemo(() => {
    const m = new Map<number, string>()
    for (const r of rosters) {
      if (r.position) m.set(r.player_id, r.position)
    }
    return m
  }, [rosters])

  const awayTeamIdResolved = resolvedGameTeamIds.away
  const homeTeamIdResolved = resolvedGameTeamIds.home

  const awayRoster = useMemo(() => {
    const list = rosters.filter(
      r =>
        r.team_abbr === toRosterTeamAbbr(game.away_team) ||
        r.team_id === game.away_team_id ||
        (awayTeamIdResolved != null && r.team_id === awayTeamIdResolved)
    )
    return list.sort((a, b) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999))
  }, [rosters, game.away_team, game.away_team_id, awayTeamIdResolved])

  const homeRoster = useMemo(() => {
    const list = rosters.filter(
      r =>
        r.team_abbr === toRosterTeamAbbr(game.home_team) ||
        r.team_id === game.home_team_id ||
        (homeTeamIdResolved != null && r.team_id === homeTeamIdResolved)
    )
    return list.sort((a, b) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999))
  }, [rosters, game.home_team, game.home_team_id, homeTeamIdResolved])

  /** Split boxscore rows by numeric team_id (from row) vs home/away ids from snapshot or roster abbreviation map. */
  const awayBox = useMemo(() => {
    return boxscores.filter(b => {
      const bid = b.team_id
      const awayId = awayTeamIdResolved
      const homeId = homeTeamIdResolved
      if (awayId != null && bid === awayId) return true
      if (homeId != null && bid === homeId) return false
      const r = rosters.find(x => x.player_id === b.player_id)
      return Boolean(
        r &&
          (r.team_abbr === toRosterTeamAbbr(game.away_team) ||
            r.team_id === game.away_team_id ||
            (awayId != null && r.team_id === awayId))
      )
    })
  }, [boxscores, rosters, game.away_team, game.away_team_id, awayTeamIdResolved, homeTeamIdResolved])

  const homeBox = useMemo(() => {
    return boxscores.filter(b => {
      const bid = b.team_id
      const awayId = awayTeamIdResolved
      const homeId = homeTeamIdResolved
      if (homeId != null && bid === homeId) return true
      if (awayId != null && bid === awayId) return false
      const r = rosters.find(x => x.player_id === b.player_id)
      return Boolean(
        r &&
          (r.team_abbr === toRosterTeamAbbr(game.home_team) ||
            r.team_id === game.home_team_id ||
            (homeId != null && r.team_id === homeId))
      )
    })
  }, [boxscores, rosters, game.home_team, game.home_team_id, awayTeamIdResolved, homeTeamIdResolved])

  // DB already scopes rows (e.g. AB/IP); only split by stat_group + team — no extra AB/IP filters here.
  const awayHitters = awayBox.filter(b => b.stat_group === 'hitting')
  const awayPitchers = awayBox.filter(b => b.stat_group === 'pitching')
  const homeHitters = homeBox.filter(b => b.stat_group === 'hitting')
  const homePitchers = homeBox.filter(b => b.stat_group === 'pitching')

  const title = `${game.away_team} @ ${game.home_team}`
  const finalOutcome = isFinalStatus(game.status) ? getFinalOutcome(game) : null
  const awayWon = finalOutcome?.kind === 'winner' && finalOutcome.side === 'away'
  const homeWon = finalOutcome?.kind === 'winner' && finalOutcome.side === 'home'

  return (
    <MlbModal title={title} onClose={onClose} wide>
      {loading && (
        <div className="space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-40 animate-pulse rounded-lg bg-white/10" />
            <div className="h-40 animate-pulse rounded-lg bg-white/10" />
          </div>
          <div className="h-32 animate-pulse rounded-lg bg-white/10" />
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && !error && (
        <div className="space-y-10">
          <div className="rounded-2xl border border-white/[0.1] bg-[#0f1117] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3 text-center sm:max-w-2xl">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Away</p>
                  <p
                    className={`mt-1 font-heading text-lg font-bold sm:text-xl ${awayWon ? 'text-[#facc15]' : 'text-white'}`}
                  >
                    {game.away_team}
                    {awayWon && (
                      <span className="ml-2 text-sm font-semibold text-[#facc15]/90">W</span>
                    )}
                  </p>
                  <p
                    className={`mt-2 font-heading text-4xl font-extrabold tabular-nums sm:text-5xl ${awayWon ? 'text-[#facc15]' : 'text-white'}`}
                  >
                    {game.away_score}
                  </p>
                </div>
                <span className="text-sm font-medium text-slate-500">@</span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Home</p>
                  <p
                    className={`mt-1 font-heading text-lg font-bold sm:text-xl ${homeWon ? 'text-[#facc15]' : 'text-white'}`}
                  >
                    {game.home_team}
                    {homeWon && (
                      <span className="ml-2 text-sm font-semibold text-[#facc15]/90">W</span>
                    )}
                  </p>
                  <p
                    className={`mt-2 font-heading text-4xl font-extrabold tabular-nums sm:text-5xl ${homeWon ? 'text-[#facc15]' : 'text-white'}`}
                  >
                    {game.home_score}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 sm:items-end">
                <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200">
                  {gameStatusEn(game.status)}
                </span>
                {finalOutcome?.kind === 'winner' && (
                  <span className="rounded-full bg-[#facc15]/15 px-3 py-1.5 text-xs font-semibold text-[#facc15]">
                    {finalOutcome.teamName} wins
                  </span>
                )}
                {finalOutcome?.kind === 'tie' && (
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400">
                    Tied game
                  </span>
                )}
              </div>
            </div>
          </div>

          <section>
            <h3 className="mb-1 font-heading text-lg font-semibold text-white">Lineups</h3>
            <p className="mb-5 text-sm text-slate-400">Tap a player to open their profile and stats.</p>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.1] bg-[#0f1117] p-4 sm:p-5">
                <p className="mb-4 border-b border-white/[0.08] pb-3 font-heading text-base font-semibold text-[#facc15]">
                  {game.away_team}
                </p>
                <ul className="space-y-0 divide-y divide-white/[0.06]">
                  {awayRoster.length === 0 && (
                    <li className="py-3 text-sm text-slate-500">No roster data</li>
                  )}
                  {awayRoster.map(r => (
                    <li key={rosterKey(r)} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                      <button
                        type="button"
                        onClick={() => onPlayerClick(r.player_id)}
                        className="min-w-0 flex-1 text-left text-base font-medium text-slate-100 transition-colors hover:text-[#facc15]"
                      >
                        {r.full_name}
                      </button>
                      <span className="shrink-0 text-sm tabular-nums text-slate-400">
                        {r.position ?? '—'} · #{r.jersey_number ?? '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/[0.1] bg-[#0f1117] p-4 sm:p-5">
                <p className="mb-4 border-b border-white/[0.08] pb-3 font-heading text-base font-semibold text-[#facc15]">
                  {game.home_team}
                </p>
                <ul className="space-y-0 divide-y divide-white/[0.06]">
                  {homeRoster.length === 0 && (
                    <li className="py-3 text-sm text-slate-500">No roster data</li>
                  )}
                  {homeRoster.map(r => (
                    <li key={rosterKey(r)} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                      <button
                        type="button"
                        onClick={() => onPlayerClick(r.player_id)}
                        className="min-w-0 flex-1 text-left text-base font-medium text-slate-100 transition-colors hover:text-[#facc15]"
                      >
                        {r.full_name}
                      </button>
                      <span className="shrink-0 text-sm tabular-nums text-slate-400">
                        {r.position ?? '—'} · #{r.jersey_number ?? '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <BoxTable
            label={`${game.away_team} — Batters`}
            rows={awayHitters}
            type="hitting"
            nameByPlayerId={nameByPlayerId}
            posByPlayerId={posByPlayerId}
            onPlayerClick={onPlayerClick}
          />
          <BoxTable
            label={`${game.away_team} — Pitchers`}
            rows={awayPitchers}
            type="pitching"
            nameByPlayerId={nameByPlayerId}
            posByPlayerId={posByPlayerId}
            onPlayerClick={onPlayerClick}
          />
          <BoxTable
            label={`${game.home_team} — Batters`}
            rows={homeHitters}
            type="hitting"
            nameByPlayerId={nameByPlayerId}
            posByPlayerId={posByPlayerId}
            onPlayerClick={onPlayerClick}
          />
          <BoxTable
            label={`${game.home_team} — Pitchers`}
            rows={homePitchers}
            type="pitching"
            nameByPlayerId={nameByPlayerId}
            posByPlayerId={posByPlayerId}
            onPlayerClick={onPlayerClick}
          />
        </div>
      )}
    </MlbModal>
  )
}

function BoxTable({
  label,
  rows,
  type,
  nameByPlayerId,
  posByPlayerId,
  onPlayerClick,
}: {
  label: string
  rows: GameBoxscoreRow[]
  type: 'hitting' | 'pitching'
  nameByPlayerId: Map<number, string>
  posByPlayerId: Map<number, string>
  onPlayerClick: (id: number) => void
}) {
  if (rows.length === 0) {
    return (
      <section>
        <h3 className="mb-1 font-heading text-base font-semibold text-white">{label}</h3>
        <p className="text-sm text-slate-500">No stats for this game yet.</p>
      </section>
    )
  }

  if (type === 'hitting') {
    const showAvgCol = rows.some(r => r.avg != null)
    return (
      <section>
        <h3 className="mb-3 font-heading text-base font-semibold text-white">{label}</h3>
        <div className="overflow-x-auto rounded-xl border border-white/[0.1] bg-[#0f1117]">
          <table className="w-full min-w-[640px] text-left text-sm text-slate-200">
            <thead className="bg-[#252b3d] text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="whitespace-nowrap px-3 py-3 text-left">Player</th>
                <th className="whitespace-nowrap px-3 py-3">Pos</th>
                <th className="whitespace-nowrap px-3 py-3 text-right">AB</th>
                {showAvgCol && (
                  <th className="whitespace-nowrap px-3 py-3 text-right">AVG</th>
                )}
                <th className="whitespace-nowrap px-3 py-3 text-right">H</th>
                <th className="whitespace-nowrap px-3 py-3 text-right">HR</th>
                <th className="whitespace-nowrap px-3 py-3 text-right">RBI</th>
                <th className="whitespace-nowrap px-3 py-3 text-right">K</th>
                <th className="whitespace-nowrap px-3 py-3 text-right">BB</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={`${row.player_id}-h`}
                  className={`transition-colors hover:bg-white/[0.06] ${i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'}`}
                >
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => onPlayerClick(row.player_id)}
                      className="text-left font-medium text-slate-100 hover:text-[#facc15]"
                    >
                      {nameByPlayerId.get(row.player_id) ?? `Player ${row.player_id}`}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">{posByPlayerId.get(row.player_id) ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{row.at_bats ?? '—'}</td>
                  {showAvgCol && (
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">
                      {row.avg != null ? fmtAvg(row.avg) : '—'}
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.hits ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.home_runs ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.rbi ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.strikeouts ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.walks ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h3 className="mb-3 font-heading text-base font-semibold text-white">{label}</h3>
      <div className="overflow-x-auto rounded-xl border border-white/[0.1] bg-[#0f1117]">
        <table className="w-full min-w-[480px] text-left text-sm text-slate-200">
          <thead className="bg-[#252b3d] text-xs font-semibold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="whitespace-nowrap px-3 py-3 text-left">Player</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">IP</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">ER</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">K</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">BB</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.player_id}-p`}
                className={`transition-colors hover:bg-white/[0.06] ${i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'}`}
              >
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onPlayerClick(row.player_id)}
                    className="text-left font-medium text-slate-100 hover:text-[#facc15]"
                  >
                    {nameByPlayerId.get(row.player_id) ?? `Player ${row.player_id}`}
                  </button>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.innings_pitched ?? '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.earned_runs ?? '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.strikeouts ?? '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.walks ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function fmtAvg(n: number) {
  if (Number.isNaN(n)) return ''
  return n.toFixed(3)
}
