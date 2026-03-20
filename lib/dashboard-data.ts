import type { DashboardLeaderboards, GameSnapshot, PlayerSearchResult, PlayerStats } from '@/types'
import {
  DASHBOARD_TOP_N,
  getDashboardSeason,
  getMinHitterAb,
  getMinPitcherIp,
  loadDashboardGamesFromSupabase,
  loadLeaderboardsSupabase,
  searchPlayersSupabase,
} from './dashboard-supabase'

export {
  DASHBOARD_TOP_N,
  getDashboardSeason,
  getMinHitterAb,
  getMinPitcherIp,
  loadDashboardDataFromSupabase,
  searchPlayersSupabase,
} from './dashboard-supabase'

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

function emptyLeaderboards(): DashboardLeaderboards {
  return {
    season: getDashboardSeason(),
    minHitterAb: getMinHitterAb(),
    minPitcherIp: getMinPitcherIp(),
    topN: DASHBOARD_TOP_N,
    hitters: { byHomeRuns: [], byAvg: [], byOps: [] },
    pitchers: { byEra: [], byStrikeouts: [], byWhip: [] },
  }
}

/** True when every leaderboard list is empty (same check as dashboard empty state). */
export function leaderboardsEmpty(lb: DashboardLeaderboards): boolean {
  return (
    lb.hitters.byHomeRuns.length === 0 &&
    lb.hitters.byAvg.length === 0 &&
    lb.hitters.byOps.length === 0 &&
    lb.pitchers.byEra.length === 0 &&
    lb.pitchers.byStrikeouts.length === 0 &&
    lb.pitchers.byWhip.length === 0
  )
}

/** When both Postgres and Supabase are configured, use Supabase first for leaderboards (matches client-only MLB pages). Set `DASHBOARD_PREFER_SUPABASE=1` or `NEXT_PUBLIC_DASHBOARD_PREFER_SUPABASE=1`. */
function preferSupabaseForLeaderboards(): boolean {
  const v = process.env.DASHBOARD_PREFER_SUPABASE ?? process.env.NEXT_PUBLIC_DASHBOARD_PREFER_SUPABASE
  return v === '1' || v === 'true' || v === 'yes'
}

function mapSqlHitRow(row: Record<string, unknown>): PlayerStats {
  const pid = Number(row.player_id)
  return {
    id: Number(row.id ?? row.player_id),
    player_id: pid,
    full_name: String(row.full_name ?? `Player ${pid}`),
    team: String(row.team_abbr ?? '—'),
    team_name: row.team_name != null ? String(row.team_name) : null,
    position: String(row.position ?? '—'),
    avg: num(row.avg),
    obp: nnum(row.obp),
    slg: nnum(row.slg),
    hits: nnum(row.hits),
    home_runs: num(row.home_runs),
    rbi: num(row.rbi),
    ops: num(row.ops),
    at_bats: nnum(row.at_bats),
    era: null,
    whip: null,
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  }
}

function mapSqlPitchRow(row: Record<string, unknown>): PlayerStats {
  const pid = Number(row.player_id)
  return {
    id: Number(row.id ?? row.player_id),
    player_id: pid,
    full_name: String(row.full_name ?? `Player ${pid}`),
    team: String(row.team_abbr ?? '—'),
    team_name: row.team_name != null ? String(row.team_name) : null,
    position: String(row.position ?? 'P'),
    avg: 0,
    home_runs: 0,
    rbi: 0,
    ops: 0,
    era: nnum(row.era),
    whip: nnum(row.whip),
    wins: nnum(row.wins),
    losses: nnum(row.losses),
    strikeouts: nnum(row.strikeouts),
    innings_pitched: nnum(row.innings_pitched),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  }
}

async function loadLeaderboardsPostgres(): Promise<DashboardLeaderboards> {
  const { sql } = await import('@vercel/postgres')
  const season = getDashboardSeason()
  const minAb = getMinHitterAb()
  const minIp = getMinPitcherIp()

  const qHr = await sql`
    SELECT p.full_name, p.team_name, p.team_abbr, p.position,
           s.player_id, s.avg, s.obp, s.slg, s.ops, s.home_runs, s.rbi, s.hits, s.at_bats, s.updated_at
    FROM player_stats s
    JOIN team_rosters p ON s.player_id = p.player_id
    WHERE s.season = ${season}
      AND s.stat_group = 'hitting'
      AND s.at_bats >= ${minAb}
    ORDER BY s.home_runs DESC NULLS LAST
    LIMIT ${DASHBOARD_TOP_N}
  `
  const qAvg = await sql`
    SELECT p.full_name, p.team_name, p.team_abbr, p.position,
           s.player_id, s.avg, s.obp, s.slg, s.ops, s.home_runs, s.rbi, s.hits, s.at_bats, s.updated_at
    FROM player_stats s
    JOIN team_rosters p ON s.player_id = p.player_id
    WHERE s.season = ${season}
      AND s.stat_group = 'hitting'
      AND s.at_bats >= ${minAb}
    ORDER BY s.avg DESC NULLS LAST
    LIMIT ${DASHBOARD_TOP_N}
  `
  const qOps = await sql`
    SELECT p.full_name, p.team_name, p.team_abbr, p.position,
           s.player_id, s.avg, s.obp, s.slg, s.ops, s.home_runs, s.rbi, s.hits, s.at_bats, s.updated_at
    FROM player_stats s
    JOIN team_rosters p ON s.player_id = p.player_id
    WHERE s.season = ${season}
      AND s.stat_group = 'hitting'
      AND s.at_bats >= ${minAb}
    ORDER BY s.ops DESC NULLS LAST
    LIMIT ${DASHBOARD_TOP_N}
  `
  const qEra = await sql`
    SELECT p.full_name, p.team_name, p.team_abbr, p.position,
           s.player_id, s.era, s.whip, s.wins, s.losses, s.strikeouts, s.innings_pitched, s.updated_at
    FROM player_stats s
    JOIN team_rosters p ON s.player_id = p.player_id
    WHERE s.season = ${season}
      AND s.stat_group = 'pitching'
      AND s.innings_pitched >= ${minIp}
    ORDER BY s.era ASC NULLS LAST
    LIMIT ${DASHBOARD_TOP_N}
  `
  const qK = await sql`
    SELECT p.full_name, p.team_name, p.team_abbr, p.position,
           s.player_id, s.era, s.whip, s.wins, s.losses, s.strikeouts, s.innings_pitched, s.updated_at
    FROM player_stats s
    JOIN team_rosters p ON s.player_id = p.player_id
    WHERE s.season = ${season}
      AND s.stat_group = 'pitching'
      AND s.innings_pitched >= ${minIp}
      AND s.strikeouts IS NOT NULL
    ORDER BY s.strikeouts DESC NULLS LAST
    LIMIT ${DASHBOARD_TOP_N}
  `
  const qWhip = await sql`
    SELECT p.full_name, p.team_name, p.team_abbr, p.position,
           s.player_id, s.era, s.whip, s.wins, s.losses, s.strikeouts, s.innings_pitched, s.updated_at
    FROM player_stats s
    JOIN team_rosters p ON s.player_id = p.player_id
    WHERE s.season = ${season}
      AND s.stat_group = 'pitching'
      AND s.innings_pitched >= ${minIp}
      AND s.whip IS NOT NULL
    ORDER BY s.whip ASC NULLS LAST
    LIMIT ${DASHBOARD_TOP_N}
  `

  return {
    season,
    minHitterAb: minAb,
    minPitcherIp: minIp,
    topN: DASHBOARD_TOP_N,
    hitters: {
      byHomeRuns: (qHr.rows as Record<string, unknown>[]).map(mapSqlHitRow),
      byAvg: (qAvg.rows as Record<string, unknown>[]).map(mapSqlHitRow),
      byOps: (qOps.rows as Record<string, unknown>[]).map(mapSqlHitRow),
    },
    pitchers: {
      byEra: (qEra.rows as Record<string, unknown>[]).map(mapSqlPitchRow),
      byStrikeouts: (qK.rows as Record<string, unknown>[]).map(mapSqlPitchRow),
      byWhip: (qWhip.rows as Record<string, unknown>[]).map(mapSqlPitchRow),
    },
  }
}

export async function loadDashboardLeaderboards(): Promise<DashboardLeaderboards> {
  const supabaseReady =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const trySupabase = async (): Promise<DashboardLeaderboards | null> => {
    if (!supabaseReady) return null
    try {
      return await loadLeaderboardsSupabase()
    } catch (e) {
      console.error('[dashboard] Supabase leaderboards failed:', e)
      return null
    }
  }

  const tryPostgres = async (): Promise<DashboardLeaderboards | null> => {
    if (!process.env.POSTGRES_URL) return null
    try {
      return await loadLeaderboardsPostgres()
    } catch (e) {
      console.error('[dashboard] Postgres leaderboards failed:', e)
      return null
    }
  }

  // Explicit: Supabase first (same DB as /mlb client queries when env points there)
  if (preferSupabaseForLeaderboards()) {
    const sb = await trySupabase()
    if (sb && !leaderboardsEmpty(sb)) return sb
    const pg = await tryPostgres()
    if (pg && !leaderboardsEmpty(pg)) return pg
    return sb ?? pg ?? emptyLeaderboards()
  }

  // Default: Postgres first (Vercel / legacy). If it returns no rows, fall back to Supabase so
  // a stale/empty POSTGRES_URL does not hide data that exists only in Supabase (common when /mlb works but /dashboard does not).
  const pgFirst = await tryPostgres()
  if (pgFirst && !leaderboardsEmpty(pgFirst)) return pgFirst
  if (pgFirst && leaderboardsEmpty(pgFirst) && supabaseReady) {
    console.warn(
      '[dashboard] Postgres leaderboards returned no rows; trying Supabase (set DASHBOARD_PREFER_SUPABASE=1 to prefer Supabase when both DBs are set).'
    )
  }

  const sb = await trySupabase()
  if (sb && !leaderboardsEmpty(sb)) return sb

  return pgFirst ?? sb ?? emptyLeaderboards()
}

/** Non-final games for dashboard API (same filter as legacy Postgres route). */
export async function loadDashboardGames(): Promise<GameSnapshot[]> {
  if (process.env.POSTGRES_URL) {
    try {
      const { sql } = await import('@vercel/postgres')
      const { rows } = await sql`
        SELECT * FROM game_snapshots WHERE status != 'Final' ORDER BY updated_at DESC LIMIT 10
      `
      return rows as GameSnapshot[]
    } catch {
      // fall through
    }
  }
  return loadDashboardGamesFromSupabase()
}

async function searchPlayersPostgres(query: string): Promise<PlayerSearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const { sql } = await import('@vercel/postgres')
  const pattern = `%${q}%`
  const { rows: roster } = await sql`
    SELECT player_id, full_name, team_abbr, position
    FROM team_rosters
    WHERE full_name ILIKE ${pattern}
    LIMIT 40
  `
  if (roster.length === 0) return []

  const ids = (roster as { player_id: number }[]).map(r => r.player_id)
  const statRows: Record<string, unknown>[] = []
  for (const id of ids) {
    const { rows } = await sql`SELECT * FROM player_stats WHERE player_id = ${id}`
    statRows.push(...rows)
  }

  const byPlayer = new Map<number, { hitting?: PlayerStatsRow; pitching?: PlayerStatsRow }>()
  for (const s of statRows as unknown as (PlayerStatsRow & { stat_group?: string })[]) {
    const pid = s.player_id
    const g = s.stat_group
    const cur = byPlayer.get(pid) ?? {}
    if (g === 'hitting') {
      const prev = cur.hitting
      if (!prev || (s.season ?? 0) > (prev.season ?? 0)) cur.hitting = s
    } else if (g === 'pitching') {
      const prev = cur.pitching
      if (!prev || (s.season ?? 0) > (prev.season ?? 0)) cur.pitching = s
    }
    byPlayer.set(pid, cur)
  }

  return (roster as { player_id: number; full_name: string; team_abbr: string | null; position: string | null }[]).map(
    r => {
      const pid = r.player_id
      const st = byPlayer.get(pid)
      const h = st?.hitting
      const p = st?.pitching
      return {
        player_id: pid,
        full_name: r.full_name ?? `Player ${pid}`,
        team: r.team_abbr ?? '—',
        position: r.position ?? '—',
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
    }
  )
}

/** Player name search: roster + latest season stats per stat_group. */
export async function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []

  if (process.env.POSTGRES_URL) {
    try {
      return await searchPlayersPostgres(q)
    } catch {
      // fall through
    }
  }
  try {
    return await searchPlayersSupabase(q)
  } catch {
    return []
  }
}
