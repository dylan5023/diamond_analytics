'use client'

import { useState } from 'react'
import type { DashboardLeaderboards, PlayerStats } from '@/types'

type HitterTab = 'hr' | 'avg' | 'ops'
type PitcherTab = 'era' | 'k' | 'whip'

/** Top 3 rows: gold / silver / bronze tinted row backgrounds. */
function podiumRowClass(i: number): string {
  if (i > 2) return 'border-b border-border/50'
  const fills = [
    'border-b border-border/35 bg-gradient-to-r from-amber-500/22 via-amber-400/14 to-amber-600/18',
    'border-b border-border/35 bg-gradient-to-r from-slate-400/20 via-slate-300/12 to-slate-500/16',
    'border-b border-border/50 bg-gradient-to-r from-orange-700/24 via-amber-800/14 to-orange-900/20',
  ] as const
  return fills[i]
}

/** Readable on dark table + medal row backgrounds. */
const leaderboardRowText = {
  rank: 'text-white/90',
  name: 'font-medium text-white',
  sub: 'text-white/78',
  team: 'font-medium text-white/88',
  teamSub: 'text-white/72',
  stat: 'text-white',
  accent: 'font-bold text-accent-light',
} as const

/** Hover: stronger accent for 4+; deepen medal tint for podium. */
function leaderboardRowHoverClass(interactive: boolean, rankIndex: number): string {
  if (!interactive) return ''
  const base = 'transition-[background-color,box-shadow] duration-200 ease-out'
  if (rankIndex === 0) {
    return `${base} hover:from-amber-400/32 hover:via-amber-300/22 hover:to-amber-500/26 hover:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.4)]`
  }
  if (rankIndex === 1) {
    return `${base} hover:from-slate-300/28 hover:via-slate-200/18 hover:to-slate-400/22 hover:shadow-[inset_0_0_0_1px_rgba(203,213,225,0.35)]`
  }
  if (rankIndex === 2) {
    return `${base} hover:from-orange-600/32 hover:via-amber-700/20 hover:to-orange-800/26 hover:shadow-[inset_0_0_0_1px_rgba(234,88,12,0.35)]`
  }
  return `${base} hover:bg-accent/22 hover:shadow-[inset_0_0_0_1px_var(--color-border-hover)]`
}

interface Props {
  data: DashboardLeaderboards
  onSelectPlayer?: (player: PlayerStats) => void
}

export default function DashboardLeaderboardTables({ data, onSelectPlayer }: Props) {
  const [hitterTab, setHitterTab] = useState<HitterTab>('hr')
  const [pitcherTab, setPitcherTab] = useState<PitcherTab>('era')

  const hitters =
    hitterTab === 'hr'
      ? data.hitters.byHomeRuns
      : hitterTab === 'avg'
        ? data.hitters.byAvg
        : data.hitters.byOps

  const pitchers =
    pitcherTab === 'era'
      ? data.pitchers.byEra
      : pitcherTab === 'k'
        ? data.pitchers.byStrikeouts
        : data.pitchers.byWhip

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-text-primary">Hitters</h2>
            <p className="mt-1 text-xs text-text-secondary">
              Season {data.season} · <code className="rounded bg-surface px-1">stat_group = hitting</code> ·
              min <strong>{data.minHitterAb} AB</strong> · Top {data.topN}
              {onSelectPlayer ? ' · Click a row for charts' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg bg-surface p-0.5">
            {(
              [
                ['hr', 'Home runs'],
                ['avg', 'AVG'],
                ['ops', 'OPS'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setHitterTab(id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  hitterTab === id ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <HitterTable rows={hitters} mode={hitterTab} onSelectPlayer={onSelectPlayer} />
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-text-primary">Pitchers</h2>
            <p className="mt-1 text-xs text-text-secondary">
              Season {data.season} · <code className="rounded bg-surface px-1">stat_group = pitching</code> ·
              min <strong>{data.minPitcherIp} IP</strong> · Top {data.topN}
              {onSelectPlayer ? ' · Click a row for charts' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg bg-surface p-0.5">
            {(
              [
                ['era', 'ERA'],
                ['k', 'Strikeouts'],
                ['whip', 'WHIP'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPitcherTab(id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  pitcherTab === id ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <PitcherTable rows={pitchers} mode={pitcherTab} onSelectPlayer={onSelectPlayer} />
      </section>
    </div>
  )
}

function HitterTable({
  rows,
  mode,
  onSelectPlayer,
}: {
  rows: PlayerStats[]
  mode: HitterTab
  onSelectPlayer?: (player: PlayerStats) => void
}) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium">Player</th>
              <th className="px-3 py-3 font-medium">Team</th>
              <th className="px-3 py-3 text-right font-medium">AB</th>
              <th className="px-3 py-3 text-right font-medium">AVG</th>
              <th className="px-3 py-3 text-right font-medium">HR</th>
              <th className="px-3 py-3 text-right font-medium">RBI</th>
              <th className="px-3 py-3 text-right font-medium">OPS</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-text-secondary">
                  No rows (check 2025 data &amp; AB minimum).
                </td>
              </tr>
            ) : (
              rows.map((p, i) => {
                const t = leaderboardRowText
                return (
                  <tr
                    key={`${p.player_id}-${mode}-${i}`}
                    role={onSelectPlayer ? 'button' : undefined}
                    tabIndex={onSelectPlayer ? 0 : undefined}
                    className={`${podiumRowClass(i)} ${leaderboardRowHoverClass(!!onSelectPlayer, i)} ${onSelectPlayer ? 'cursor-pointer' : ''}`}
                    onClick={() => onSelectPlayer?.(p)}
                    onKeyDown={e => {
                      if (onSelectPlayer && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        onSelectPlayer(p)
                      }
                    }}
                  >
                    <td className={`px-4 py-2.5 text-xs tabular-nums ${t.rank}`}>{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className={`text-sm ${t.name}`}>{p.full_name}</div>
                      <div className={`text-[10px] ${t.sub}`}>{p.position}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className={`text-xs ${t.team}`}>{p.team}</div>
                      {p.team_name && (
                        <div className={`text-[10px] ${t.teamSub}`}>{p.team_name}</div>
                      )}
                    </td>
                    <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.stat}`}>
                      {p.at_bats ?? '—'}
                    </td>
                    <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.stat}`}>
                      {p.avg.toFixed(3)}
                    </td>
                    <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.stat}`}>{p.home_runs}</td>
                    <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.stat}`}>{p.rbi}</td>
                    <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.accent}`}>
                      {p.ops.toFixed(3)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PitcherTable({
  rows,
  mode,
  onSelectPlayer,
}: {
  rows: PlayerStats[]
  mode: PitcherTab
  onSelectPlayer?: (player: PlayerStats) => void
}) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-text-muted">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium">Player</th>
              <th className="px-3 py-3 font-medium">Team</th>
              <th className="px-3 py-3 text-right font-medium">IP</th>
              <th className="px-3 py-3 text-right font-medium">ERA</th>
              <th className="px-3 py-3 text-right font-medium">WHIP</th>
              <th className="px-3 py-3 text-right font-medium">K</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-text-secondary">
                  No rows (check 2025 data &amp; IP minimum).
                </td>
              </tr>
            ) : (
              rows.map((p, i) => {
                const t = leaderboardRowText
                return (
                  <tr
                    key={`${p.player_id}-${mode}-${i}`}
                    role={onSelectPlayer ? 'button' : undefined}
                    tabIndex={onSelectPlayer ? 0 : undefined}
                    className={`${podiumRowClass(i)} ${leaderboardRowHoverClass(!!onSelectPlayer, i)} ${onSelectPlayer ? 'cursor-pointer' : ''}`}
                    onClick={() => onSelectPlayer?.(p)}
                    onKeyDown={e => {
                      if (onSelectPlayer && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        onSelectPlayer(p)
                      }
                    }}
                  >
                    <td className={`px-4 py-2.5 text-xs tabular-nums ${t.rank}`}>{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className={`text-sm ${t.name}`}>{p.full_name}</div>
                      <div className={`text-[10px] ${t.sub}`}>{p.position}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className={`text-xs ${t.team}`}>{p.team}</div>
                      {p.team_name && (
                        <div className={`text-[10px] ${t.teamSub}`}>{p.team_name}</div>
                      )}
                    </td>
                    <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.stat}`}>
                      {p.innings_pitched != null ? p.innings_pitched.toFixed(2) : '—'}
                    </td>
                    <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.accent}`}>
                      {p.era != null ? p.era.toFixed(2) : '—'}
                    </td>
                    <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.stat}`}>
                      {p.whip != null ? p.whip.toFixed(2) : '—'}
                    </td>
                    <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.stat}`}>
                      {p.strikeouts != null ? Math.round(p.strikeouts) : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
