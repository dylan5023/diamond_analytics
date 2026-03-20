'use client'

import type { PlayerSearchResult } from '@/types'

interface Props {
  results: PlayerSearchResult[]
  loading?: boolean
  query: string
  onSelectPlayer?: (player: PlayerSearchResult) => void
}

export default function PlayerSearchResults({ results, loading, query, onSelectPlayer }: Props) {
  if (loading) {
    return (
      <div className="glass-card p-8">
        <div className="h-40 animate-pulse rounded-lg bg-surface" />
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="font-heading text-sm font-medium text-text-primary">No players found</p>
        <p className="mt-2 text-sm text-text-secondary">
          Try another spelling or a longer name (&quot;{query}&quot;).
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-text-muted">
          Search results
        </h3>
        <p className="mt-1 text-xs text-text-secondary">
          {results.length} match{results.length === 1 ? '' : 'es'} for &quot;{query}&quot; · Click a row for charts
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-text-muted">
              <th className="px-5 py-3 font-medium">Player</th>
              <th className="px-3 py-3 font-medium">Team</th>
              <th className="px-3 py-3 font-medium">Pos</th>
              <th className="px-3 py-3 font-medium text-right">Hitting</th>
              <th className="px-3 py-3 font-medium text-right">Pitching</th>
            </tr>
          </thead>
          <tbody>
            {results.map(r => (
              <tr
                key={r.player_id}
                role={onSelectPlayer ? 'button' : undefined}
                tabIndex={onSelectPlayer ? 0 : undefined}
                className={`border-b border-border/50 transition-colors hover:bg-surface ${
                  onSelectPlayer ? 'cursor-pointer' : ''
                }`}
                onClick={() => onSelectPlayer?.(r)}
                onKeyDown={e => {
                  if (onSelectPlayer && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onSelectPlayer(r)
                  }
                }}
              >
                <td className="px-5 py-3">
                  <div className="text-sm font-medium text-text-primary">{r.full_name}</div>
                  <div className="text-[10px] text-text-muted">ID {r.player_id}</div>
                </td>
                <td className="px-3 py-3 text-xs font-medium text-text-secondary">{r.team}</td>
                <td className="px-3 py-3 text-xs text-text-secondary">{r.position}</td>
                <td className="px-3 py-3 text-right text-xs tabular-nums text-text-primary">
                  {r.hitting ? (
                    <span>
                      {r.hitting.avg.toFixed(3)} / {r.hitting.ops.toFixed(3)} · {r.hitting.home_runs} HR ·{' '}
                      {r.hitting.rbi} RBI
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right text-xs tabular-nums text-text-primary">
                  {r.pitching ? (
                    <span>
                      {r.pitching.era != null ? r.pitching.era.toFixed(3) : '—'} ERA ·{' '}
                      {r.pitching.whip != null ? r.pitching.whip.toFixed(3) : '—'} WHIP
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
