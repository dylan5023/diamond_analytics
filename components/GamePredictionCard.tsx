'use client'

import type { GameSnapshot } from '@/types'
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, LabelList } from 'recharts'

interface Props {
  game: GameSnapshot
}

export default function GamePredictionCard({ game }: Props) {
  const isLive = game.status === 'Live'
  const isScheduled = game.status === 'Scheduled'

  const homeProb = +game.win_probability.toFixed(4)
  const awayProb = +(1 - game.win_probability).toFixed(4)
  const probData = [
    {
      name: game.away_team,
      value: awayProb,
      highlight: awayProb >= homeProb,
    },
    {
      name: game.home_team,
      value: homeProb,
      highlight: homeProb >= awayProb,
    },
  ] as const

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-live">
              <span className="inline-block h-2 w-2 rounded-full bg-live live-dot" />
              LIVE
            </span>
          )}
          {isScheduled && (
            <span className="text-xs font-medium text-text-muted">SCHEDULED</span>
          )}
          {!isLive && !isScheduled && (
            <span className="text-xs font-medium text-text-muted">{game.status.toUpperCase()}</span>
          )}
        </div>
        {isLive && (
          <span className="text-xs font-medium text-text-muted">
            {game.inning_half} {game.inning}{game.inning === 1 ? 'st' : game.inning === 2 ? 'nd' : game.inning === 3 ? 'rd' : 'th'}
          </span>
        )}
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-start">
            <span className="font-heading text-sm font-semibold text-text-secondary">{game.away_team}</span>
            <span className="font-heading text-3xl font-extrabold tabular-nums">{game.away_score}</span>
          </div>
          <span className="text-xs font-medium text-text-muted">vs</span>
          <div className="flex flex-col items-end">
            <span className="font-heading text-sm font-semibold text-text-secondary">{game.home_team}</span>
            <span className="font-heading text-3xl font-extrabold tabular-nums">{game.home_score}</span>
          </div>
        </div>

        {!isScheduled && (
          <div className="mt-4 min-w-0">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Win Probability
            </div>
            <ResponsiveContainer width="100%" height={40}>
              <BarChart data={probData} layout="vertical" barCategoryGap={4}>
                <XAxis type="number" domain={[0, 1]} hide />
                <YAxis type="category" dataKey="name" width={32} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {probData.map((row, i) => (
                    <Cell key={i} fill={row.highlight ? '#c9a84c' : 'rgba(148, 163, 184, 0.35)'} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    formatter={(v: string | number | boolean | null | undefined) =>
                      v != null ? `${(Number(v) * 100).toFixed(0)}%` : ''
                    }
                    style={{ fontSize: 10 }}
                    fill="#e2e8f0"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
