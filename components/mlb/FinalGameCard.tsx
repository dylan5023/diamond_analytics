'use client'

import { getFinalOutcome } from '@/lib/mlb-game'
import type { GameSnapshot } from '@/types'

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

export default function FinalGameCard({ game, onOpen }: Props) {
  const homeProb = game.win_probability ?? 0
  const awayProb = 1 - homeProb
  const outcome = getFinalOutcome(game)
  const awayWon = outcome.kind === 'winner' && outcome.side === 'away'
  const homeWon = outcome.kind === 'winner' && outcome.side === 'home'

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
      className={`overflow-hidden rounded-xl transition-all ${
        onOpen ? 'cursor-pointer hover:border-[#facc15]/30 hover:ring-1 hover:ring-[#facc15]/20' : ''
      } hover:border-white/12`}
      style={{
        backgroundColor: '#1a1f2e',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#94a3b8]">FINAL</span>
          {game.game_date && (
            <span className="text-xs text-[#94a3b8]">· {formatGameDate(game.game_date)}</span>
          )}
        </div>
        {outcome.kind === 'winner' && (
          <span className="rounded-full bg-[#facc15]/15 px-3 py-1 text-xs font-semibold text-[#facc15]">
            {outcome.teamName} wins
          </span>
        )}
        {outcome.kind === 'tie' && (
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#94a3b8]">
            Tied
          </span>
        )}
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-start">
            <span
              className={`font-heading text-2xl font-bold ${awayWon ? 'text-[#facc15]' : 'text-white'}`}
            >
              {game.away_team}
              {awayWon && (
                <span className="ml-2 text-sm font-semibold text-[#facc15]/90">W</span>
              )}
            </span>
            <span
              className={`font-heading text-4xl font-bold tabular-nums ${awayWon ? 'text-[#facc15]' : 'text-white'}`}
            >
              {game.away_score}
            </span>
          </div>
          <span className="text-sm font-medium text-[#94a3b8]">@</span>
          <div className="flex flex-col items-end">
            <span
              className={`font-heading text-2xl font-bold ${homeWon ? 'text-[#facc15]' : 'text-white'}`}
            >
              {game.home_team}
              {homeWon && (
                <span className="ml-2 text-sm font-semibold text-[#facc15]/90">W</span>
              )}
            </span>
            <span
              className={`font-heading text-4xl font-bold tabular-nums ${homeWon ? 'text-[#facc15]' : 'text-white'}`}
            >
              {game.home_score}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[#94a3b8]">
            Final Win Probability
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
