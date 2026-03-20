'use client'

import { useState } from 'react'
import type { PlayerStats } from '@/types'

interface Props {
  hitters: PlayerStats[]
  pitchers: PlayerStats[]
}

type SortKey = 'avg' | 'home_runs' | 'rbi' | 'ops' | 'era' | 'whip'

export default function PlayerStatsTable({ hitters, pitchers }: Props) {
  const [tab, setTab] = useState<'hitters' | 'pitchers'>('hitters')
  const [sortKey, setSortKey] = useState<SortKey>('ops')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const currentPlayers = tab === 'hitters' ? hitters : pitchers

  const sorted = [...currentPlayers].sort((a, b) => {
    const aVal = a[sortKey] ?? 999
    const bVal = b[sortKey] ?? 999
    if (sortKey === 'era' || sortKey === 'whip') {
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    }
    return sortDir === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number)
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'era' || key === 'whip' ? 'asc' : 'desc')
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-0.5 inline">
        {sortDir === 'desc'
          ? <path d="M12 5v14M19 12l-7 7-7-7" />
          : <path d="M12 19V5M5 12l7-7 7 7" />
        }
      </svg>
    )
  }

  const hitterColumns: { key: SortKey; label: string }[] = [
    { key: 'avg', label: 'AVG' },
    { key: 'home_runs', label: 'HR' },
    { key: 'rbi', label: 'RBI' },
    { key: 'ops', label: 'OPS' },
  ]

  const pitcherColumns: { key: SortKey; label: string }[] = [
    { key: 'era', label: 'ERA' },
    { key: 'whip', label: 'WHIP' },
  ]

  const columns = tab === 'hitters' ? hitterColumns : pitcherColumns

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-text-muted">
          Top Players
        </h3>
        <div className="flex gap-1 rounded-lg bg-surface p-0.5">
          <button
            onClick={() => { setTab('hitters'); setSortKey('ops'); setSortDir('desc') }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              tab === 'hitters' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Hitters
          </button>
          <button
            onClick={() => { setTab('pitchers'); setSortKey('era'); setSortDir('asc') }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              tab === 'pitchers' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Pitchers
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-text-muted">
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium">Player</th>
              <th className="px-3 py-3 font-medium">Team</th>
              {columns.map(col => (
                <th key={col.key} className="px-3 py-3 font-medium text-right">
                  <button
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-0.5 transition-colors hover:text-accent"
                  >
                    {col.label}
                    <SortIcon column={col.key} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((player, i) => (
              <tr
                key={player.player_id}
                className="border-b border-border/50 transition-colors hover:bg-surface"
              >
                <td className="px-5 py-3 text-xs text-text-muted">{i + 1}</td>
                <td className="px-3 py-3">
                  <div className="text-sm font-medium text-text-primary">{player.full_name}</div>
                  <div className="text-[10px] text-text-muted">{player.position}</div>
                </td>
                <td className="px-3 py-3 text-xs font-medium text-text-secondary">{player.team}</td>
                {tab === 'hitters' ? (
                  <>
                    <td className="px-3 py-3 text-right font-heading text-sm tabular-nums text-text-primary">{player.avg.toFixed(3)}</td>
                    <td className="px-3 py-3 text-right font-heading text-sm tabular-nums text-text-primary">{player.home_runs}</td>
                    <td className="px-3 py-3 text-right font-heading text-sm tabular-nums text-text-primary">{player.rbi}</td>
                    <td className="px-3 py-3 text-right font-heading text-sm font-bold tabular-nums text-accent">{player.ops.toFixed(3)}</td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-3 text-right font-heading text-sm font-bold tabular-nums text-accent">{player.era?.toFixed(3) ?? '-'}</td>
                    <td className="px-3 py-3 text-right font-heading text-sm tabular-nums text-text-primary">{player.whip?.toFixed(3) ?? '-'}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
