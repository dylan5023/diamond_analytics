'use client'

import { useState } from 'react'
import type { DashboardLeaderboards, PlayerStats } from '@/types'

type HitterTab = 'hr' | 'avg' | 'ops'
type PitcherTab = 'era' | 'k' | 'whip'

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
              rows.map((p, i) => (
                <tr
                  key={`${p.player_id}-${mode}`}
                  role={onSelectPlayer ? 'button' : undefined}
                  tabIndex={onSelectPlayer ? 0 : undefined}
                  className={`border-b border-border/50 hover:bg-surface ${onSelectPlayer ? 'cursor-pointer' : ''}`}
                  onClick={() => onSelectPlayer?.(p)}
                  onKeyDown={e => {
                    if (onSelectPlayer && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      onSelectPlayer(p)
                    }
                  }}
                >
                  <td className="px-4 py-2.5 text-xs text-text-muted">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="text-sm font-medium text-text-primary">{p.full_name}</div>
                    <div className="text-[10px] text-text-muted">{p.position}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-xs font-medium text-text-secondary">{p.team}</div>
                    {p.team_name && (
                      <div className="text-[10px] text-text-muted">{p.team_name}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm tabular-nums text-text-primary">
                    {p.at_bats ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm tabular-nums text-text-primary">
                    {p.avg.toFixed(3)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm tabular-nums text-text-primary">{p.home_runs}</td>
                  <td className="px-3 py-2.5 text-right text-sm tabular-nums text-text-primary">{p.rbi}</td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold tabular-nums text-accent">
                    {p.ops.toFixed(3)}
                  </td>
                </tr>
              ))
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
              rows.map((p, i) => (
                <tr
                  key={`${p.player_id}-${mode}`}
                  role={onSelectPlayer ? 'button' : undefined}
                  tabIndex={onSelectPlayer ? 0 : undefined}
                  className={`border-b border-border/50 hover:bg-surface ${onSelectPlayer ? 'cursor-pointer' : ''}`}
                  onClick={() => onSelectPlayer?.(p)}
                  onKeyDown={e => {
                    if (onSelectPlayer && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      onSelectPlayer(p)
                    }
                  }}
                >
                  <td className="px-4 py-2.5 text-xs text-text-muted">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="text-sm font-medium text-text-primary">{p.full_name}</div>
                    <div className="text-[10px] text-text-muted">{p.position}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-xs font-medium text-text-secondary">{p.team}</div>
                    {p.team_name && (
                      <div className="text-[10px] text-text-muted">{p.team_name}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm tabular-nums text-text-primary">
                    {p.innings_pitched != null ? p.innings_pitched.toFixed(3) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold tabular-nums text-accent">
                    {p.era != null ? p.era.toFixed(3) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm tabular-nums text-text-primary">
                    {p.whip != null ? p.whip.toFixed(3) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm tabular-nums text-text-primary">
                    {p.strikeouts != null ? Math.round(p.strikeouts) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
