'use client'

import type { GameSnapshot } from '@/types'

function inningLabel(half: string, inning: number): string {
  const ord = inning === 1 ? 'st' : inning === 2 ? 'nd' : inning === 3 ? 'rd' : 'th'
  return `${half} ${inning}${ord}`
}

function recordStr(wins?: number, losses?: number): string {
  if (wins == null || losses == null) return ''
  return `${wins}-${losses}`
}

interface Props {
  game: GameSnapshot
}

export default function LiveGameCard({ game }: Props) {
  const homeProb = game.win_probability ?? 0
  const awayProb = 1 - homeProb

  return (
    <div
      className="overflow-hidden rounded-xl transition-all hover:border-white/12"
      style={{
        backgroundColor: '#1a1f2e',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-xs font-semibold text-[#22c55e]">LIVE</span>
        </div>
        <span className="text-xs font-medium text-[#94a3b8]">
          {inningLabel(game.inning_half, game.inning)}
        </span>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-start">
            <span className="font-heading text-2xl font-bold text-white">{game.away_team}</span>
            <span className="font-heading text-4xl font-bold tabular-nums text-white">
              {game.away_score}
            </span>
          </div>
          <span className="text-sm font-medium text-[#94a3b8]">VS</span>
          <div className="flex flex-col items-end">
            <span className="font-heading text-2xl font-bold text-white">{game.home_team}</span>
            <span className="font-heading text-4xl font-bold tabular-nums text-white">
              {game.home_score}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#94a3b8]">
            Win Probability
          </div>
          <div className="flex h-8 w-full overflow-hidden rounded-md">
            <div
              className="flex items-center justify-end pr-2 transition-all"
              style={{
                width: `${awayProb * 100}%`,
                backgroundColor: '#94a3b8',
                minWidth: awayProb > 0 ? '40px' : 0,
              }}
            >
              {awayProb > 0.1 && (
                <span className="text-xs font-semibold text-white">
                  {(awayProb * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <div
              className="flex items-center justify-start pl-2 transition-all"
              style={{
                width: `${homeProb * 100}%`,
                backgroundColor: '#facc15',
                minWidth: homeProb > 0 ? '40px' : 0,
              }}
            >
              {homeProb > 0.1 && (
                <span className="text-xs font-semibold text-[#0f1117]">
                  {(homeProb * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-3 text-xs text-[#94a3b8]">
          <div className="flex flex-col gap-0.5">
            {game.away_pitcher && (
              <span>
                <span className="text-[#64748b]">Away:</span> {game.away_pitcher}
              </span>
            )}
            {game.home_pitcher && (
              <span>
                <span className="text-[#64748b]">Home:</span> {game.home_pitcher}
              </span>
            )}
          </div>
          <div className="flex gap-4">
            {recordStr(game.away_wins, game.away_losses) && (
              <span>{game.away_team} {recordStr(game.away_wins, game.away_losses)}</span>
            )}
            {recordStr(game.home_wins, game.home_losses) && (
              <span>{game.home_team} {recordStr(game.home_wins, game.home_losses)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
