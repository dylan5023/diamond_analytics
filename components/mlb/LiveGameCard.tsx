'use client'

import type { GameSnapshot } from '@/types'
import WinProbabilityBar from '@/components/mlb/WinProbabilityBar'

function inningLabel(half: string, inning: number): string {
  const ord = inning === 1 ? 'st' : inning === 2 ? 'nd' : inning === 3 ? 'rd' : 'th'
  return `${half} ${inning}${ord}`
}

function recordStr(wins?: number, losses?: number): string {
  if (wins == null || losses == null) return ''
  return `${wins}-${losses}`
}

function formatGameDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Props {
  game: GameSnapshot
  onOpen?: () => void
}

export default function LiveGameCard({ game, onOpen }: Props) {
  const homeProb = game.win_probability ?? 0
  const awayProb = 1 - homeProb

  return (
    <div
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={e => {
        if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onOpen()
        }
      }}
      className={`overflow-hidden rounded-2xl transition-all ${
        onOpen ? 'cursor-pointer hover:border-[#facc15]/30 hover:ring-1 hover:ring-[#facc15]/20' : ''
      } hover:border-white/12`}
      style={{
        backgroundColor: '#1a1f2e',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 sm:px-7">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-sm font-semibold text-[#22c55e]">LIVE</span>
          {game.game_date && (
            <span className="text-sm text-[#94a3b8]">· {formatGameDate(game.game_date)}</span>
          )}
        </div>
        <span className="text-sm font-medium text-[#94a3b8]">
          {inningLabel(game.inning_half, game.inning)}
        </span>
      </div>

      <div className="px-6 py-5 sm:px-7 sm:py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-start">
            <span className="font-heading text-3xl font-bold text-white">{game.away_team}</span>
            <span className="font-heading text-5xl font-bold tabular-nums leading-tight text-white">
              {game.away_score}
            </span>
          </div>
          <span className="text-base font-medium text-[#94a3b8]">vs</span>
          <div className="flex flex-col items-end">
            <span className="font-heading text-3xl font-bold text-white">{game.home_team}</span>
            <span className="font-heading text-5xl font-bold tabular-nums leading-tight text-white">
              {game.home_score}
            </span>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2.5 text-xs font-medium uppercase tracking-wider text-[#94a3b8]">
            Win Probability
          </div>
          <WinProbabilityBar awayProb={awayProb} homeProb={homeProb} />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4 text-sm text-[#94a3b8]">
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
