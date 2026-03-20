'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { GameSnapshot } from '@/types'
import { FadeIn, FadeInOnScroll, StaggerContainer, StaggerItem } from '@/components/MotionWrapper'
import LiveGameCard from '@/components/mlb/LiveGameCard'
import ScheduledGameCard from '@/components/mlb/ScheduledGameCard'
import FinalGameCard from '@/components/mlb/FinalGameCard'
import GameDetailModal from '@/components/mlb/GameDetailModal'
import PlayerDetailModal from '@/components/mlb/PlayerDetailModal'

const VANCOUVER_TZ = 'America/Vancouver'

function getTodayDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: VANCOUVER_TZ }) // YYYY-MM-DD
}

function getTomorrowDateString(): string {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return tomorrow.toLocaleDateString('en-CA', { timeZone: VANCOUVER_TZ })
}

export default function MLBPage() {
  const [games, setGames] = useState<GameSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<GameSnapshot | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null)

  const fetchGames = async () => {
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
  }

  useEffect(() => {
    fetchGames()
    const interval = setInterval(fetchGames, 15_000)
    return () => clearInterval(interval)
  }, [])

  const liveGames = games.filter(g => g.status === 'Live')
  const scheduledGames = games.filter(g => g.status === 'Scheduled')
  const finalGames = games.filter(g => g.status === 'Final')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0f1117' }}>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <FadeIn>
          <div className="mb-12">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1 text-xs font-medium text-[#22c55e]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              Auto-refresh every 15s
            </div>
            <h1 className="font-heading text-4xl font-extrabold tracking-tight text-white md:text-5xl">
              MLB Real-time Win Probability
            </h1>
            <p className="mt-3 max-w-lg text-[#94a3b8]">
              Check real-time scores and win probability for today&apos;s games.
            </p>
          </div>
        </FadeIn>

        {loading && (
          <div className="space-y-8">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-52 animate-pulse rounded-xl"
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
                <h2 className="mb-4 font-heading text-xl font-bold text-white">
                  <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#22c55e] animate-pulse" />
                  Live Games
                </h2>
                <StaggerContainer className="mb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {liveGames.map(game => (
                    <StaggerItem key={game.game_pk}>
                      <LiveGameCard game={game} onOpen={() => setSelectedGame(game)} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </FadeInOnScroll>
            )}

            {scheduledGames.length > 0 && (
              <FadeInOnScroll>
                <h2 className="mb-4 font-heading text-xl font-bold text-white">
                  Upcoming & Scheduled
                </h2>
                <StaggerContainer className="mb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {scheduledGames.map(game => (
                    <StaggerItem key={game.game_pk}>
                      <ScheduledGameCard game={game} onOpen={() => setSelectedGame(game)} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </FadeInOnScroll>
            )}

            {finalGames.length > 0 && (
              <FadeInOnScroll>
                <h2 className="mb-4 font-heading text-xl font-bold text-white">Final</h2>
                <StaggerContainer className="mb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {finalGames.map(game => (
                    <StaggerItem key={game.game_pk}>
                      <FinalGameCard game={game} onOpen={() => setSelectedGame(game)} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </FadeInOnScroll>
            )}

            {liveGames.length === 0 && scheduledGames.length === 0 && finalGames.length === 0 && (
              <div
                className="rounded-xl p-12 text-center"
                style={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-[#94a3b8]">No games for today.</p>
              </div>
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
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </div>
  )
}
