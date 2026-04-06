/**
 * 2026 시즌 누적 스탯 — game_boxscores를 클라이언트에서 집계
 * player_stats 테이블이 아닌 game_boxscores를 사용하므로
 * 경기 단위 데이터가 있으면 실시간 반영됨
 */
import { supabase } from '@/lib/supabase'

export const SEASON_2026_START = '2026-03-25'

export interface HitterRow {
  player_id: number
  full_name: string
  team_abbr: string
  position: string
  games: number
  at_bats: number
  hits: number
  avg: number
  home_runs: number
  rbi: number
  stolen_bases: number
  walks: number
  small_sample: boolean // at_bats < 10
}

export interface PitcherRow {
  player_id: number
  full_name: string
  team_abbr: string
  position: string
  games: number
  innings_pitched: number
  era: number
  earned_runs: number
  strikeouts: number
  walks: number
  small_sample: boolean // innings_pitched < 9
}

type RosterEntry = { full_name: string; team_abbr: string; position: string }

async function fetchRosterMap(playerIds: number[]): Promise<Map<number, RosterEntry>> {
  if (playerIds.length === 0) return new Map()
  const { data, error } = await supabase
    .from('team_rosters')
    .select('player_id, full_name, team_abbr, position')
    .in('player_id', playerIds)
  if (error) throw error
  const map = new Map<number, RosterEntry>()
  for (const r of data ?? []) {
    const pid = r.player_id as number
    if (!map.has(pid)) {
      map.set(pid, {
        full_name: (r.full_name as string) ?? `Player ${pid}`,
        team_abbr: (r.team_abbr as string) ?? '—',
        position: (r.position as string) ?? '—',
      })
    }
  }
  return map
}

async function fetchAllBoxscoreRows(statGroup: 'hitting' | 'pitching'): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = []
  let from = 0
  const pageSize = 1000
  const cols =
    statGroup === 'hitting'
      ? 'player_id, game_pk, at_bats, hits, home_runs, rbi, stolen_bases, walks'
      : 'player_id, game_pk, innings_pitched, earned_runs, strikeouts, walks'

  for (;;) {
    const { data, error } = await supabase
      .from('game_boxscores')
      .select(cols)
      .eq('stat_group', statGroup)
      .gte('game_date', SEASON_2026_START)
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data?.length) break
    rows.push(...(data as unknown as Record<string, unknown>[]))
    if (data.length < pageSize) break
    from += pageSize
  }
  return rows
}

function n(v: unknown): number {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

export async function fetchSeasonHitters(minAb = 5): Promise<HitterRow[]> {
  const rows = await fetchAllBoxscoreRows('hitting')

  type Acc = {
    games: Set<number>
    at_bats: number
    hits: number
    home_runs: number
    rbi: number
    stolen_bases: number
    walks: number
  }
  const map = new Map<number, Acc>()

  for (const row of rows) {
    const pid = row.player_id as number
    const cur = map.get(pid) ?? {
      games: new Set<number>(),
      at_bats: 0,
      hits: 0,
      home_runs: 0,
      rbi: 0,
      stolen_bases: 0,
      walks: 0,
    }
    cur.games.add(row.game_pk as number)
    cur.at_bats += n(row.at_bats)
    cur.hits += n(row.hits)
    cur.home_runs += n(row.home_runs)
    cur.rbi += n(row.rbi)
    cur.stolen_bases += n(row.stolen_bases)
    cur.walks += n(row.walks)
    map.set(pid, cur)
  }

  const qualified = [...map.entries()].filter(([, v]) => v.at_bats >= minAb)
  if (qualified.length === 0) return []

  const roster = await fetchRosterMap(qualified.map(([id]) => id))

  const result: HitterRow[] = qualified.map(([pid, stats]) => {
    const ab = stats.at_bats
    const h = stats.hits
    const avg = ab > 0 ? Math.round((h / ab) * 1000) / 1000 : 0
    const ro = roster.get(pid)
    return {
      player_id: pid,
      full_name: ro?.full_name ?? `Player ${pid}`,
      team_abbr: ro?.team_abbr ?? '—',
      position: ro?.position ?? '—',
      games: stats.games.size,
      at_bats: ab,
      hits: h,
      avg,
      home_runs: stats.home_runs,
      rbi: stats.rbi,
      stolen_bases: stats.stolen_bases,
      walks: stats.walks,
      small_sample: ab < 10,
    }
  })

  result.sort((a, b) => b.avg - a.avg)
  return result
}

// ─── 2026 리그 평균 ────────────────────────────────────────────────────────────
// game_boxscores 전체 집계에서 계산 (player_stats 테이블 불필요)

export interface League2026HittingAvg {
  avg: number
  obp: number   // (H + BB) / (AB + BB) — HBP 제외 근사치
  home_runs: number  // 자격 선수 1인당 평균
  rbi: number
  stolen_bases: number
  walks: number
  qualifiedPlayers: number
}

export interface League2026PitchingAvg {
  era: number
  strikeouts: number  // 자격 선수 1인당 평균
  walks: number
  qualifiedPlayers: number
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export async function fetchLeague2026HittingAvg(minAb = 5): Promise<League2026HittingAvg | null> {
  const rows = await fetchAllBoxscoreRows('hitting')

  const map = new Map<number, { ab: number; h: number; hr: number; rbi: number; sb: number; bb: number }>()
  for (const row of rows) {
    const pid = row.player_id as number
    const cur = map.get(pid) ?? { ab: 0, h: 0, hr: 0, rbi: 0, sb: 0, bb: 0 }
    cur.ab += n(row.at_bats)
    cur.h += n(row.hits)
    cur.hr += n(row.home_runs)
    cur.rbi += n(row.rbi)
    cur.sb += n(row.stolen_bases)
    cur.bb += n(row.walks)
    map.set(pid, cur)
  }

  const qualified = [...map.values()].filter(v => v.ab >= minAb)
  if (qualified.length === 0) return null

  return {
    avg: mean(qualified.map(v => (v.ab > 0 ? v.h / v.ab : 0))),
    obp: mean(qualified.map(v => (v.ab + v.bb > 0 ? (v.h + v.bb) / (v.ab + v.bb) : 0))),
    home_runs: mean(qualified.map(v => v.hr)),
    rbi: mean(qualified.map(v => v.rbi)),
    stolen_bases: mean(qualified.map(v => v.sb)),
    walks: mean(qualified.map(v => v.bb)),
    qualifiedPlayers: qualified.length,
  }
}

export async function fetchLeague2026PitchingAvg(minIp = 3): Promise<League2026PitchingAvg | null> {
  const rows = await fetchAllBoxscoreRows('pitching')

  const map = new Map<number, { ip: number; er: number; k: number; bb: number }>()
  for (const row of rows) {
    const pid = row.player_id as number
    const cur = map.get(pid) ?? { ip: 0, er: 0, k: 0, bb: 0 }
    cur.ip += n(row.innings_pitched)
    cur.er += n(row.earned_runs)
    cur.k += n(row.strikeouts)
    cur.bb += n(row.walks)
    map.set(pid, cur)
  }

  const qualified = [...map.values()].filter(v => v.ip >= minIp)
  if (qualified.length === 0) return null

  return {
    era: mean(qualified.map(v => (v.ip > 0 ? (v.er * 9) / v.ip : 0))),
    strikeouts: mean(qualified.map(v => v.k)),
    walks: mean(qualified.map(v => v.bb)),
    qualifiedPlayers: qualified.length,
  }
}

export async function fetchSeasonPitchers(minIp = 3): Promise<PitcherRow[]> {
  const rows = await fetchAllBoxscoreRows('pitching')

  type Acc = {
    games: Set<number>
    innings_pitched: number
    earned_runs: number
    strikeouts: number
    walks: number
  }
  const map = new Map<number, Acc>()

  for (const row of rows) {
    const pid = row.player_id as number
    const cur = map.get(pid) ?? {
      games: new Set<number>(),
      innings_pitched: 0,
      earned_runs: 0,
      strikeouts: 0,
      walks: 0,
    }
    cur.games.add(row.game_pk as number)
    cur.innings_pitched += n(row.innings_pitched)
    cur.earned_runs += n(row.earned_runs)
    cur.strikeouts += n(row.strikeouts)
    cur.walks += n(row.walks)
    map.set(pid, cur)
  }

  const qualified = [...map.entries()].filter(([, v]) => v.innings_pitched >= minIp)
  if (qualified.length === 0) return []

  const roster = await fetchRosterMap(qualified.map(([id]) => id))

  const result: PitcherRow[] = qualified.map(([pid, stats]) => {
    const ip = stats.innings_pitched
    const era = ip > 0 ? Math.round((stats.earned_runs * 9.0) / ip * 100) / 100 : 0
    const ro = roster.get(pid)
    return {
      player_id: pid,
      full_name: ro?.full_name ?? `Player ${pid}`,
      team_abbr: ro?.team_abbr ?? '—',
      position: ro?.position ?? '—',
      games: stats.games.size,
      innings_pitched: Math.round(ip * 10) / 10,
      era,
      earned_runs: stats.earned_runs,
      strikeouts: stats.strikeouts,
      walks: stats.walks,
      small_sample: ip < 9,
    }
  })

  result.sort((a, b) => a.era - b.era)
  return result
}
