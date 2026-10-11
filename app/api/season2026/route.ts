/**
 * GET /api/season2026
 *
 * game_boxscores를 서버에서 집계해 2026 시즌 리더보드를 반환합니다.
 * 클라이언트가 수만 건의 raw 데이터를 직접 가져오는 대신,
 * 서버에서 한 번 처리 후 소량의 JSON을 반환 → 로딩 속도 대폭 개선.
 *
 * 5분 캐시 (CDN): 새 경기 데이터가 생겨도 5분 내 반영
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SEASON_2026_START = '2026-03-25'
const PAGE_SIZE = 1000

// 서버 사이드 Supabase 클라이언트
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

function n(v: unknown): number {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

// ─── 전체 행 페이지네이션 fetch ──────────────────────────────────────────────

async function fetchAll(statGroup: 'hitting' | 'pitching') {
  const cols =
    statGroup === 'hitting'
      ? 'player_id, game_pk, at_bats, hits, home_runs, rbi, stolen_bases, walks'
      : 'player_id, game_pk, innings_pitched, earned_runs, strikeouts, walks'

  const rows: Record<string, unknown>[] = []
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from('game_boxscores')
      .select(cols)
      .eq('stat_group', statGroup)
      .gte('game_date', SEASON_2026_START)
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(`Supabase error: ${error.message}`)
    if (!data?.length) break
    rows.push(...(data as unknown as Record<string, unknown>[]))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

// ─── 로스터 맵 ───────────────────────────────────────────────────────────────

async function fetchRosterMap(playerIds: number[]) {
  if (playerIds.length === 0) return new Map<number, { full_name: string; team_abbr: string; position: string }>()

  const { data, error } = await supabase
    .from('team_rosters')
    .select('player_id, full_name, team_abbr, position')
    .in('player_id', playerIds)

  if (error) throw new Error(`Roster error: ${error.message}`)

  const map = new Map<number, { full_name: string; team_abbr: string; position: string }>()
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

// ─── 타자 집계 ───────────────────────────────────────────────────────────────

async function buildHitters(minAb = 5) {
  const rows = await fetchAll('hitting')

  type Acc = { games: Set<number>; at_bats: number; hits: number; home_runs: number; rbi: number; stolen_bases: number; walks: number }
  const map = new Map<number, Acc>()

  for (const row of rows) {
    const pid = row.player_id as number
    const cur = map.get(pid) ?? { games: new Set<number>(), at_bats: 0, hits: 0, home_runs: 0, rbi: 0, stolen_bases: 0, walks: 0 }
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
  const roster = await fetchRosterMap(qualified.map(([id]) => id))

  // 리그 평균 계산
  const allAvgs = qualified.map(([, v]) => v.at_bats > 0 ? v.hits / v.at_bats : 0)
  const leagueAvg = {
    avg: mean(allAvgs),
    home_runs: mean(qualified.map(([, v]) => v.home_runs)),
    rbi: mean(qualified.map(([, v]) => v.rbi)),
    stolen_bases: mean(qualified.map(([, v]) => v.stolen_bases)),
    walks: mean(qualified.map(([, v]) => v.walks)),
    qualifiedPlayers: qualified.length,
  }

  const hitters = qualified.map(([pid, stats]) => {
    const ab = stats.at_bats
    const ro = roster.get(pid)
    return {
      player_id: pid,
      full_name: ro?.full_name ?? `Player ${pid}`,
      team_abbr: ro?.team_abbr ?? '—',
      position: ro?.position ?? '—',
      games: stats.games.size,
      at_bats: ab,
      hits: stats.hits,
      avg: ab > 0 ? Math.round((stats.hits / ab) * 1000) / 1000 : 0,
      home_runs: stats.home_runs,
      rbi: stats.rbi,
      stolen_bases: stats.stolen_bases,
      walks: stats.walks,
      small_sample: ab < 10,
    }
  })

  hitters.sort((a, b) => b.avg - a.avg)
  return { hitters, leagueAvg }
}

// ─── 투수 집계 ───────────────────────────────────────────────────────────────

async function buildPitchers(minIp = 3) {
  const rows = await fetchAll('pitching')

  type Acc = { games: Set<number>; innings_pitched: number; earned_runs: number; strikeouts: number; walks: number }
  const map = new Map<number, Acc>()

  for (const row of rows) {
    const pid = row.player_id as number
    const cur = map.get(pid) ?? { games: new Set<number>(), innings_pitched: 0, earned_runs: 0, strikeouts: 0, walks: 0 }
    cur.games.add(row.game_pk as number)
    cur.innings_pitched += n(row.innings_pitched)
    cur.earned_runs += n(row.earned_runs)
    cur.strikeouts += n(row.strikeouts)
    cur.walks += n(row.walks)
    map.set(pid, cur)
  }

  const qualified = [...map.entries()].filter(([, v]) => v.innings_pitched >= minIp)
  const roster = await fetchRosterMap(qualified.map(([id]) => id))

  // 리그 평균 계산
  const leagueAvg = {
    era: mean(qualified.map(([, v]) => v.innings_pitched > 0 ? (v.earned_runs * 9) / v.innings_pitched : 0)),
    strikeouts: mean(qualified.map(([, v]) => v.strikeouts)),
    walks: mean(qualified.map(([, v]) => v.walks)),
    qualifiedPlayers: qualified.length,
  }

  const pitchers = qualified.map(([pid, stats]) => {
    const ip = stats.innings_pitched
    const ro = roster.get(pid)
    return {
      player_id: pid,
      full_name: ro?.full_name ?? `Player ${pid}`,
      team_abbr: ro?.team_abbr ?? '—',
      position: ro?.position ?? '—',
      games: stats.games.size,
      innings_pitched: Math.round(ip * 10) / 10,
      era: ip > 0 ? Math.round((stats.earned_runs * 9 / ip) * 100) / 100 : 0,
      earned_runs: stats.earned_runs,
      strikeouts: stats.strikeouts,
      walks: stats.walks,
      small_sample: ip < 9,
    }
  })

  pitchers.sort((a, b) => a.era - b.era)
  return { pitchers, leagueAvg }
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const [hitterResult, pitcherResult] = await Promise.all([
      buildHitters(5),
      buildPitchers(3),
    ])

    return NextResponse.json(
      {
        hitters: hitterResult.hitters,
        pitchers: pitcherResult.pitchers,
        leagueAvg: {
          hitting: hitterResult.leagueAvg,
          pitching: pitcherResult.leagueAvg,
        },
      },
      {
        // 5분 캐시 — 경기 데이터가 생겨도 5분 내 반영
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      },
    )
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    )
  }
}
