import { NextResponse } from 'next/server'
import type { PlayerStats } from '@/types'
import { loadDashboardGames, loadDashboardLeaderboards } from '@/lib/dashboard-data'

export const revalidate = 60

function dedupePlayers(lists: PlayerStats[][]): PlayerStats[] {
  const seen = new Set<number>()
  const out: PlayerStats[] = []
  for (const list of lists) {
    for (const p of list) {
      if (seen.has(p.player_id)) continue
      seen.add(p.player_id)
      out.push(p)
    }
  }
  return out
}

export async function GET() {
  const [leaderboards, games] = await Promise.all([
    loadDashboardLeaderboards(),
    loadDashboardGames(),
  ])

  const players = dedupePlayers([
    leaderboards.hitters.byHomeRuns,
    leaderboards.hitters.byAvg,
    leaderboards.hitters.byOps,
    leaderboards.pitchers.byEra,
    leaderboards.pitchers.byStrikeouts,
    leaderboards.pitchers.byWhip,
  ])

  return NextResponse.json({
    games,
    leaderboards,
    players,
  })
}
