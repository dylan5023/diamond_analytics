/**
 * Supabase-only dashboard helpers (safe for browser bundle — no @vercel/postgres).
 * Used by /dashboard client page and by server code via re-exports from dashboard-data.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type {
  DashboardData,
  DashboardLeaderboards,
  GameSnapshot,
  PlayerChartProfile,
  PlayerSearchResult,
  PlayerStats,
  SeasonLeagueAverages,
} from '@/types'

export const DASHBOARD_TOP_N = 10

/** Works on server + client; use NEXT_PUBLIC_* in browser for season / cutoffs. */
export function getDashboardSeason(): number {
  const raw = process.env.DASHBOARD_SEASON ?? process.env.NEXT_PUBLIC_DASHBOARD_SEASON
  if (raw != null && String(raw).trim() !== '') {
    const n = parseInt(String(raw), 10)
    if (Number.isFinite(n) && n >= 1990 && n <= 2100) return n
  }
  return 2025
}

export function getMinHitterAb(): number {
  const raw = process.env.DASHBOARD_MIN_HITTER_AB ?? process.env.NEXT_PUBLIC_DASHBOARD_MIN_HITTER_AB
  if (raw != null && String(raw).trim() !== '') {
    const n = parseInt(String(raw), 10)
    if (Number.isFinite(n) && n >= 0) return n
  }
  return 300
}

export function getMinPitcherIp(): number {
  const raw = process.env.DASHBOARD_MIN_PITCHER_IP ?? process.env.NEXT_PUBLIC_DASHBOARD_MIN_PITCHER_IP
  if (raw != null && String(raw).trim() !== '') {
    const n = parseFloat(String(raw))
    if (Number.isFinite(n) && n >= 0) return n
  }
  return 50
}

function num(v: unknown): number {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function nnum(v: unknown): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

type RosterInfo = {
  full_name: string
  team_abbr: string | null
  team_name: string | null
  position: string | null
}

type PlayerStatsRow = {
  id?: number
  player_id: number
  season?: number
  stat_group?: string
  avg?: unknown
  obp?: unknown
  slg?: unknown
  hits?: unknown
  home_runs?: unknown
  rbi?: unknown
  ops?: unknown
  at_bats?: unknown
  era?: unknown
  whip?: unknown
  wins?: unknown
  losses?: unknown
  strikeouts?: unknown
  innings_pitched?: unknown
  updated_at?: unknown
}

async function rosterMapForIds(client: SupabaseClient, playerIds: number[]) {
  if (playerIds.length === 0) return new Map<number, RosterInfo>()

  const build = (data: Record<string, unknown>[]) => {
    const m = new Map<number, RosterInfo>()
    for (const r of data) {
      const id = r.player_id as number
      if (!m.has(id)) {
        m.set(id, {
          full_name: (r.full_name as string) ?? `Player ${id}`,
          team_abbr: r.team_abbr as string | null,
          team_name: (r.team_name as string | null | undefined) ?? null,
          position: r.position as string | null,
        })
      }
    }
    return m
  }

  const withName = await client
    .from('team_rosters')
    .select('player_id, full_name, team_abbr, team_name, position')
    .in('player_id', playerIds)

  if (!withName.error) {
    return build((withName.data ?? []) as Record<string, unknown>[])
  }

  const basic = await client
    .from('team_rosters')
    .select('player_id, full_name, team_abbr, position')
    .in('player_id', playerIds)

  if (basic.error) throw basic.error
  return build((basic.data ?? []) as Record<string, unknown>[])
}

function mapHitterRow(r: PlayerStatsRow, ro: RosterInfo): PlayerStats {
  const pid = r.player_id
  return {
    id: typeof r.id === 'number' ? r.id : pid,
    player_id: pid,
    full_name: ro.full_name,
    team: ro.team_abbr ?? '—',
    team_name: ro.team_name,
    position: ro.position ?? '—',
    avg: num(r.avg),
    obp: nnum(r.obp),
    slg: nnum(r.slg),
    hits: nnum(r.hits),
    home_runs: num(r.home_runs),
    rbi: num(r.rbi),
    ops: num(r.ops),
    at_bats: nnum(r.at_bats),
    era: null,
    whip: null,
    updated_at: (r.updated_at as string) ?? new Date().toISOString(),
  }
}

function mapPitcherRow(r: PlayerStatsRow, ro: RosterInfo): PlayerStats {
  const pid = r.player_id
  return {
    id: typeof r.id === 'number' ? r.id : pid,
    player_id: pid,
    full_name: ro.full_name,
    team: ro.team_abbr ?? '—',
    team_name: ro.team_name,
    position: ro.position ?? 'P',
    avg: 0,
    home_runs: 0,
    rbi: 0,
    ops: 0,
    era: nnum(r.era),
    whip: nnum(r.whip),
    wins: nnum(r.wins),
    losses: nnum(r.losses),
    strikeouts: nnum(r.strikeouts),
    innings_pitched: nnum(r.innings_pitched),
    updated_at: (r.updated_at as string) ?? new Date().toISOString(),
  }
}

async function mapHitterRowsInnerJoin(
  client: SupabaseClient,
  rows: PlayerStatsRow[]
): Promise<PlayerStats[]> {
  if (rows.length === 0) return []
  const roster = await rosterMapForIds(
    client,
    rows.map(r => r.player_id)
  )
  const out: PlayerStats[] = []
  for (const r of rows) {
    const ro = roster.get(r.player_id)
    if (!ro) continue
    out.push(mapHitterRow(r, ro))
    if (out.length >= DASHBOARD_TOP_N) break
  }
  return out
}

async function mapPitcherRowsInnerJoin(
  client: SupabaseClient,
  rows: PlayerStatsRow[]
): Promise<PlayerStats[]> {
  if (rows.length === 0) return []
  const roster = await rosterMapForIds(
    client,
    rows.map(r => r.player_id)
  )
  const out: PlayerStats[] = []
  for (const r of rows) {
    const ro = roster.get(r.player_id)
    if (!ro) continue
    out.push(mapPitcherRow(r, ro))
    if (out.length >= DASHBOARD_TOP_N) break
  }
  return out
}

const SUPABASE_LEADERBOARD_FETCH_CAP = 200

/** No `id` column on some schemas — use `player_id` for row identity in the UI. */
const HITTER_SELECT_STATS =
  'player_id, season, avg, obp, slg, ops, home_runs, rbi, hits, at_bats, updated_at'
const PITCHER_SELECT_STATS =
  'player_id, season, era, whip, wins, losses, strikeouts, innings_pitched, updated_at'

/** Leaderboards from Supabase only (same logic as server fallback). */
export async function loadLeaderboardsSupabase(): Promise<DashboardLeaderboards> {
  const client = supabase
  const season = getDashboardSeason()
  const minAb = getMinHitterAb()
  const minIp = getMinPitcherIp()
  const fetchLimit = Math.min(SUPABASE_LEADERBOARD_FETCH_CAP, DASHBOARD_TOP_N * 25)

  const hitBase = () =>
    client
      .from('player_stats')
      .select(HITTER_SELECT_STATS)
      .eq('season', season)
      .eq('stat_group', 'hitting')
      .gte('at_bats', minAb)

  const pitBase = () =>
    client
      .from('player_stats')
      .select(PITCHER_SELECT_STATS)
      .eq('season', season)
      .eq('stat_group', 'pitching')
      .gte('innings_pitched', minIp)

  const [
    { data: hrData, error: e1 },
    { data: avgData, error: e2 },
    { data: opsData, error: e3 },
    { data: eraData, error: e4 },
    { data: kData, error: e5 },
    { data: whipData, error: e6 },
  ] = await Promise.all([
    hitBase().order('home_runs', { ascending: false }).limit(fetchLimit),
    hitBase().not('avg', 'is', null).order('avg', { ascending: false }).limit(fetchLimit),
    hitBase().not('ops', 'is', null).order('ops', { ascending: false }).limit(fetchLimit),
    pitBase().order('era', { ascending: true }).limit(fetchLimit),
    pitBase().not('strikeouts', 'is', null).order('strikeouts', { ascending: false }).limit(fetchLimit),
    pitBase().not('whip', 'is', null).order('whip', { ascending: true }).limit(fetchLimit),
  ])

  const err = e1 || e2 || e3 || e4 || e5 || e6
  if (err) throw err

  const [byHR, byAvg, byOps, byEra, byK, byWhip] = await Promise.all([
    mapHitterRowsInnerJoin(client, (hrData ?? []) as PlayerStatsRow[]),
    mapHitterRowsInnerJoin(client, (avgData ?? []) as PlayerStatsRow[]),
    mapHitterRowsInnerJoin(client, (opsData ?? []) as PlayerStatsRow[]),
    mapPitcherRowsInnerJoin(client, (eraData ?? []) as PlayerStatsRow[]),
    mapPitcherRowsInnerJoin(client, (kData ?? []) as PlayerStatsRow[]),
    mapPitcherRowsInnerJoin(client, (whipData ?? []) as PlayerStatsRow[]),
  ])

  return {
    season,
    minHitterAb: minAb,
    minPitcherIp: minIp,
    topN: DASHBOARD_TOP_N,
    hitters: {
      byHomeRuns: byHR,
      byAvg: byAvg,
      byOps: byOps,
    },
    pitchers: {
      byEra: byEra,
      byStrikeouts: byK,
      byWhip: byWhip,
    },
  }
}

/** Non-final games from Supabase (same filter as API). */
export async function loadDashboardGamesFromSupabase(): Promise<GameSnapshot[]> {
  try {
    const { data, error } = await supabase
      .from('game_snapshots')
      .select('*')
      .neq('status', 'Final')
      .order('updated_at', { ascending: false })
      .limit(10)
    if (error) throw error
    return (data ?? []) as GameSnapshot[]
  } catch {
    return []
  }
}

function dedupePlayersFromLeaderboards(lb: DashboardLeaderboards): PlayerStats[] {
  const seen = new Set<number>()
  const out: PlayerStats[] = []
  const lists = [
    lb.hitters.byHomeRuns,
    lb.hitters.byAvg,
    lb.hitters.byOps,
    lb.pitchers.byEra,
    lb.pitchers.byStrikeouts,
    lb.pitchers.byWhip,
  ]
  for (const list of lists) {
    for (const p of list) {
      if (seen.has(p.player_id)) continue
      seen.add(p.player_id)
      out.push(p)
    }
  }
  return out
}

/** Full dashboard payload for client (MLB-style direct Supabase). */
export async function loadDashboardDataFromSupabase(): Promise<DashboardData> {
  const [leaderboards, games] = await Promise.all([
    loadLeaderboardsSupabase(),
    loadDashboardGamesFromSupabase(),
  ])
  return {
    games,
    leaderboards,
    players: dedupePlayersFromLeaderboards(leaderboards),
  }
}

/** Player search — Supabase only. */
export async function searchPlayersSupabase(query: string): Promise<PlayerSearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const { data: rosterRows, error: rosterErr } = await supabase
    .from('team_rosters')
    .select('player_id, full_name, team_abbr, position')
    .ilike('full_name', `%${q}%`)
    .limit(40)

  if (rosterErr) throw rosterErr
  const rosterList = rosterRows ?? []
  if (rosterList.length === 0) return []

  const ids = rosterList.map(r => r.player_id as number)
  const { data: statRows, error: statErr } = await supabase.from('player_stats').select('*').in('player_id', ids)

  if (statErr) throw statErr

  const byPlayer = new Map<number, { hitting?: PlayerStatsRow; pitching?: PlayerStatsRow }>()
  for (const s of statRows ?? []) {
    const row = s as PlayerStatsRow & { stat_group?: string }
    const pid = row.player_id
    const g = row.stat_group
    const cur = byPlayer.get(pid) ?? {}
    if (g === 'hitting') {
      const prev = cur.hitting
      if (!prev || (row.season ?? 0) > (prev.season ?? 0)) cur.hitting = row
    } else if (g === 'pitching') {
      const prev = cur.pitching
      if (!prev || (row.season ?? 0) > (prev.season ?? 0)) cur.pitching = row
    }
    byPlayer.set(pid, cur)
  }

  return rosterList.map(r => {
    const pid = r.player_id as number
    const st = byPlayer.get(pid)
    const h = st?.hitting
    const p = st?.pitching
    return {
      player_id: pid,
      full_name: (r.full_name as string) ?? `Player ${pid}`,
      team: (r.team_abbr as string) ?? '—',
      position: (r.position as string) ?? '—',
      hitting: h
        ? {
            avg: num(h.avg),
            ops: num(h.ops),
            home_runs: num(h.home_runs),
            rbi: num(h.rbi),
          }
        : null,
      pitching: p
        ? {
            era: nnum(p.era),
            whip: nnum(p.whip),
          }
        : null,
    }
  })
}

/** Full hitting + pitching rows for the dashboard season (for chart modal). */
export async function fetchPlayerStatsForCharts(playerId: number): Promise<PlayerChartProfile | null> {
  const season = getDashboardSeason()

  const rosterRes = await supabase
    .from('team_rosters')
    .select('full_name, team_abbr, position')
    .eq('player_id', playerId)
    .limit(1)
    .maybeSingle()

  const { data: statRows, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('player_id', playerId)
    .eq('season', season)

  if (error) throw error

  let hitting: PlayerChartProfile['hitting'] = null
  let pitching: PlayerChartProfile['pitching'] = null

  for (const raw of statRows ?? []) {
    const row = raw as PlayerStatsRow & { stat_group?: string }
    const g = row.stat_group
    if (g === 'hitting') {
      hitting = {
        avg: num(row.avg),
        obp: nnum(row.obp),
        slg: nnum(row.slg),
        ops: num(row.ops),
        home_runs: num(row.home_runs),
        rbi: num(row.rbi),
        hits: nnum(row.hits),
        at_bats: nnum(row.at_bats),
      }
    } else if (g === 'pitching') {
      pitching = {
        era: nnum(row.era),
        whip: nnum(row.whip),
        strikeouts: nnum(row.strikeouts),
        innings_pitched: nnum(row.innings_pitched),
        wins: nnum(row.wins),
        losses: nnum(row.losses),
      }
    }
  }

  const roster = rosterRes.data as { full_name?: string; team_abbr?: string | null; position?: string | null } | null

  if (!hitting && !pitching && !roster) {
    return null
  }

  return {
    season,
    full_name: roster?.full_name ?? `Player ${playerId}`,
    team: roster?.team_abbr ?? '—',
    position: roster?.position ?? '—',
    hitting,
    pitching,
  }
}

const PAGE_SIZE = 1000

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

/** Paginated fetch for league-average calculation (same qualifiers as leaderboards). */
async function fetchAllHittingForLeague(season: number, minAb: number): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('player_stats')
      .select('avg, obp, slg, ops, home_runs, rbi, hits, at_bats')
      .eq('season', season)
      .eq('stat_group', 'hitting')
      .gte('at_bats', minAb)
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data?.length) break
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}

async function fetchAllPitchingForLeague(season: number, minIp: number): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('player_stats')
      .select('era, whip, strikeouts, innings_pitched, wins, losses')
      .eq('season', season)
      .eq('stat_group', 'pitching')
      .gte('innings_pitched', minIp)
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data?.length) break
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}

/**
 * Season means among qualified players (same AB / IP cutoffs as the dashboard).
 * Used as the green “season average” line on player charts.
 */
export async function fetchSeasonLeagueAverages(season: number): Promise<SeasonLeagueAverages> {
  const minAb = getMinHitterAb()
  const minIp = getMinPitcherIp()

  const [hitRows, pitRows] = await Promise.all([
    fetchAllHittingForLeague(season, minAb),
    fetchAllPitchingForLeague(season, minIp),
  ])

  let hitting: SeasonLeagueAverages['hitting'] = null
  if (hitRows.length > 0) {
    const avgs = hitRows.map(r => num(r.avg))
    const obps = hitRows.map(r => nnum(r.obp)).filter((v): v is number => v != null)
    const slgs = hitRows.map(r => nnum(r.slg)).filter((v): v is number => v != null)
    const ops = hitRows.map(r => num(r.ops))
    const hrs = hitRows.map(r => num(r.home_runs))
    const rbis = hitRows.map(r => num(r.rbi))
    const hitss = hitRows.map(r => nnum(r.hits)).filter((v): v is number => v != null)
    const abs = hitRows.map(r => nnum(r.at_bats)).filter((v): v is number => v != null)

    hitting = {
      avg: mean(avgs) ?? 0,
      obp: mean(obps) ?? mean(avgs) ?? 0,
      slg: mean(slgs) ?? 0,
      ops: mean(ops) ?? 0,
      home_runs: mean(hrs) ?? 0,
      rbi: mean(rbis) ?? 0,
      hits: mean(hitss) ?? 0,
      at_bats: mean(abs) ?? 0,
    }
  }

  let pitching: SeasonLeagueAverages['pitching'] = null
  if (pitRows.length > 0) {
    const eras = pitRows.map(r => nnum(r.era)).filter((v): v is number => v != null)
    const whips = pitRows.map(r => nnum(r.whip)).filter((v): v is number => v != null)
    const ks = pitRows.map(r => nnum(r.strikeouts)).filter((v): v is number => v != null)
    const ips = pitRows.map(r => nnum(r.innings_pitched)).filter((v): v is number => v != null)
    const ws = pitRows.map(r => nnum(r.wins)).filter((v): v is number => v != null)
    const ls = pitRows.map(r => nnum(r.losses)).filter((v): v is number => v != null)

    pitching = {
      era: mean(eras) ?? 0,
      whip: mean(whips) ?? 0,
      strikeouts: mean(ks) ?? 0,
      innings_pitched: mean(ips) ?? 0,
      wins: mean(ws) ?? 0,
      losses: mean(ls) ?? 0,
    }
  }

  return { hitting, pitching }
}
