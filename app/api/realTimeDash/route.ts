import { NextResponse } from 'next/server'
import { mockGameSnapshots, mockPlayerStats } from '@/lib/mock-data'

export const revalidate = 60

const USE_MOCK = !process.env.POSTGRES_URL

export async function GET() {
  if (USE_MOCK) {
    return NextResponse.json({
      games: mockGameSnapshots,
      players: mockPlayerStats,
    })
  }

  const { sql } = await import('@vercel/postgres')
  const [games, players] = await Promise.all([
    sql`SELECT * FROM game_snapshots WHERE status != 'Final' ORDER BY updated_at DESC LIMIT 10`,
    sql`SELECT * FROM player_stats ORDER BY ops DESC LIMIT 20`,
  ])
  return NextResponse.json({ games: games.rows, players: players.rows })
}
