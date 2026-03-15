'use client'

import useSWR from 'swr'
import type { DashboardData } from '@/types'
import { fetcher } from '@/lib/utils'
import GamePredictionCard from '@/components/GamePredictionCard'
import PlayerStatsTable from '@/components/PlayerStatsTable'
import { FadeIn, FadeInOnScroll, StaggerContainer, StaggerItem } from '@/components/MotionWrapper'

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR<DashboardData>(
    '/api/realTimeDash',
    fetcher,
    { refreshInterval: 1000 * 60 }
  )

  const liveGames = data?.games.filter(g => g.status === 'Live') ?? []
  const otherGames = data?.games.filter(g => g.status !== 'Live') ?? []

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <FadeIn>
        <div className="mb-12">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-live/30 bg-live/10 px-3 py-1 text-xs font-medium text-live">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-live live-dot" />
            Auto-refresh every 60s
          </div>
          <h1 className="font-heading text-4xl font-extrabold tracking-tight md:text-5xl">
            Live Dashboard
          </h1>
          <p className="mt-3 max-w-lg text-text-secondary">
            Real-time game scores, win probability predictions, and top player statistics.
          </p>
        </div>
      </FadeIn>

      {isLoading && (
        <div className="space-y-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card h-52 animate-pulse bg-surface" />
            ))}
          </div>
          <div className="glass-card h-96 animate-pulse bg-surface" />
        </div>
      )}

      {error && (
        <div className="glass-card p-8 text-center">
          <p className="text-text-secondary">Failed to load dashboard data. Please try again later.</p>
        </div>
      )}

      {data && (
        <>
          {liveGames.length > 0 && (
            <FadeInOnScroll>
              <h2 className="mb-4 font-heading text-xl font-bold">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-live live-dot" />
                Live Games
              </h2>
              <StaggerContainer className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {liveGames.map(game => (
                  <StaggerItem key={game.game_pk}>
                    <GamePredictionCard game={game} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </FadeInOnScroll>
          )}

          {otherGames.length > 0 && (
            <FadeInOnScroll>
              <h2 className="mb-4 font-heading text-xl font-bold">Upcoming & Scheduled</h2>
              <StaggerContainer className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {otherGames.map(game => (
                  <StaggerItem key={game.game_pk}>
                    <GamePredictionCard game={game} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </FadeInOnScroll>
          )}

          <FadeInOnScroll>
            <PlayerStatsTable players={data.players} />
          </FadeInOnScroll>
        </>
      )}
    </div>
  )
}
