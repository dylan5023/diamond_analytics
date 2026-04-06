'use client'

import { useMemo, useState } from 'react'
import type { HitterRow, PitcherRow } from '@/lib/season-stats'

const TOP_N = 10

type HitterTab = 'avg' | 'hr' | 'rbi' | 'sb'
type PitcherTab = 'era' | 'k'

// ─── Shared table styles (mirrors DashboardLeaderboardTables) ─────────────────

function podiumRowClass(i: number): string {
  if (i > 2) return 'border-b border-border/50'
  const fills = [
    'border-b border-border/35 bg-gradient-to-r from-amber-500/22 via-amber-400/14 to-amber-600/18',
    'border-b border-border/35 bg-gradient-to-r from-slate-400/20 via-slate-300/12 to-slate-500/16',
    'border-b border-border/50 bg-gradient-to-r from-orange-700/24 via-amber-800/14 to-orange-900/20',
  ] as const
  return fills[i]
}

const t = {
  rank: 'text-white/90',
  name: 'font-medium text-white',
  sub: 'text-white/78',
  team: 'font-medium text-white/88',
  stat: 'text-white',
  accent: 'font-bold text-accent-light',
} as const

function rowHoverClass(interactive: boolean, i: number): string {
  if (!interactive) return ''
  const base = 'transition-[background-color,box-shadow] duration-200 ease-out'
  if (i === 0) return `${base} hover:from-amber-400/32 hover:via-amber-300/22 hover:to-amber-500/26 hover:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.4)]`
  if (i === 1) return `${base} hover:from-slate-300/28 hover:via-slate-200/18 hover:to-slate-400/22 hover:shadow-[inset_0_0_0_1px_rgba(203,213,225,0.35)]`
  if (i === 2) return `${base} hover:from-orange-600/32 hover:via-amber-700/20 hover:to-orange-800/26 hover:shadow-[inset_0_0_0_1px_rgba(234,88,12,0.35)]`
  return `${base} hover:bg-accent/22 hover:shadow-[inset_0_0_0_1px_var(--color-border-hover)]`
}

function fmtAvg(n: number) {
  return n === 0 ? '.000' : n.toFixed(3).replace(/^0/, '')
}

// ─── Sub-tab pill group ───────────────────────────────────────────────────────

function TabGroup<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-surface p-0.5">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            active === id ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Empty row ────────────────────────────────────────────────────────────────

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-text-secondary">
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl">⚾</span>
          <p>{label}</p>
          <p className="text-xs text-text-muted">
            Rows appear once <code className="rounded bg-surface px-1">game_boxscores</code> has 2026 season data.
          </p>
        </div>
      </td>
    </tr>
  )
}

// ─── Hitters table ─────────────────────────────────────────────────────────────

function HitterTable2026({
  rows,
  tab,
  onSelectPlayer,
}: {
  rows: HitterRow[]
  tab: HitterTab
  onSelectPlayer?: (playerId: number) => void
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
              <th className="px-3 py-3 text-right font-medium">G</th>
              <th className="px-3 py-3 text-right font-medium">AB</th>
              <th className="px-3 py-3 text-right font-medium">H</th>
              <th className="px-3 py-3 text-right font-medium">AVG</th>
              <th className="px-3 py-3 text-right font-medium">HR</th>
              <th className="px-3 py-3 text-right font-medium">RBI</th>
              <th className="px-3 py-3 text-right font-medium">SB</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={10} label="No hitters yet — check back once 2026 games are logged." />
            ) : (
              rows.map((p, i) => (
                <tr
                  key={`${p.player_id}-${tab}`}
                  role={onSelectPlayer ? 'button' : undefined}
                  tabIndex={onSelectPlayer ? 0 : undefined}
                  className={`${podiumRowClass(i)} ${rowHoverClass(!!onSelectPlayer, i)} ${onSelectPlayer ? 'cursor-pointer' : ''}`}
                  onClick={() => onSelectPlayer?.(p.player_id)}
                  onKeyDown={e => {
                    if (onSelectPlayer && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      onSelectPlayer(p.player_id)
                    }
                  }}
                >
                  <td className={`px-4 py-2.5 text-xs tabular-nums ${t.rank}`}>{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className={`text-sm ${t.name}`}>{p.full_name}</div>
                    <div className={`text-[10px] ${t.sub}`}>
                      {p.position} · {p.games}G
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 text-xs ${t.team}`}>{p.team_abbr}</td>
                  <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.stat}`}>{p.games}</td>
                  <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.stat}`}>{p.at_bats}</td>
                  <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.stat}`}>{p.hits}</td>
                  <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${tab === 'avg' ? t.accent : t.stat}`}>
                    {fmtAvg(p.avg)}
                    {p.small_sample && <span className="ml-0.5 text-[10px] font-normal text-text-muted">*</span>}
                  </td>
                  <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${tab === 'hr' ? t.accent : t.stat}`}>{p.home_runs}</td>
                  <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${tab === 'rbi' ? t.accent : t.stat}`}>{p.rbi}</td>
                  <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${tab === 'sb' ? t.accent : t.stat}`}>{p.stolen_bases}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Pitchers table ────────────────────────────────────────────────────────────

function PitcherTable2026({
  rows,
  tab,
  onSelectPlayer,
}: {
  rows: PitcherRow[]
  tab: PitcherTab
  onSelectPlayer?: (playerId: number) => void
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
              <th className="px-3 py-3 text-right font-medium">G</th>
              <th className="px-3 py-3 text-right font-medium">IP</th>
              <th className="px-3 py-3 text-right font-medium">ERA</th>
              <th className="px-3 py-3 text-right font-medium">ER</th>
              <th className="px-3 py-3 text-right font-medium">K</th>
              <th className="px-3 py-3 text-right font-medium">BB</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={9} label="No pitchers yet — check back once 2026 games are logged." />
            ) : (
              rows.map((p, i) => (
                <tr
                  key={`${p.player_id}-${tab}`}
                  role={onSelectPlayer ? 'button' : undefined}
                  tabIndex={onSelectPlayer ? 0 : undefined}
                  className={`${podiumRowClass(i)} ${rowHoverClass(!!onSelectPlayer, i)} ${onSelectPlayer ? 'cursor-pointer' : ''}`}
                  onClick={() => onSelectPlayer?.(p.player_id)}
                  onKeyDown={e => {
                    if (onSelectPlayer && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      onSelectPlayer(p.player_id)
                    }
                  }}
                >
                  <td className={`px-4 py-2.5 text-xs tabular-nums ${t.rank}`}>{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className={`text-sm ${t.name}`}>{p.full_name}</div>
                    <div className={`text-[10px] ${t.sub}`}>
                      {p.position} · {p.games}G
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 text-xs ${t.team}`}>{p.team_abbr}</td>
                  <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.stat}`}>{p.games}</td>
                  <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.stat}`}>{p.innings_pitched.toFixed(1)}</td>
                  <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${tab === 'era' ? t.accent : t.stat}`}>
                    {p.era.toFixed(2)}
                    {p.small_sample && <span className="ml-0.5 text-[10px] font-normal text-text-muted">*</span>}
                  </td>
                  <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.stat}`}>{p.earned_runs}</td>
                  <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${tab === 'k' ? t.accent : t.stat}`}>{p.strikeouts}</td>
                  <td className={`px-3 py-2.5 text-right text-sm tabular-nums ${t.stat}`}>{p.walks}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  hitters: HitterRow[]
  pitchers: PitcherRow[]
  onSelectPlayer?: (playerId: number) => void
}

export default function Season2026LeaderboardTables({ hitters, pitchers, onSelectPlayer }: Props) {
  const [hitterTab, setHitterTab] = useState<HitterTab>('avg')
  const [pitcherTab, setPitcherTab] = useState<PitcherTab>('era')

  const topHitters = useMemo(() => {
    const copy = [...hitters]
    if (hitterTab === 'avg') copy.sort((a, b) => b.avg - a.avg)
    else if (hitterTab === 'hr') copy.sort((a, b) => b.home_runs - a.home_runs)
    else if (hitterTab === 'rbi') copy.sort((a, b) => b.rbi - a.rbi)
    else copy.sort((a, b) => b.stolen_bases - a.stolen_bases)
    return copy.slice(0, TOP_N)
  }, [hitters, hitterTab])

  const topPitchers = useMemo(() => {
    const copy = [...pitchers]
    if (pitcherTab === 'era') copy.sort((a, b) => a.era - b.era)
    else copy.sort((a, b) => b.strikeouts - a.strikeouts)
    return copy.slice(0, TOP_N)
  }, [pitchers, pitcherTab])

  const hitterTabs: { id: HitterTab; label: string }[] = [
    { id: 'avg', label: 'AVG' },
    { id: 'hr', label: 'Home Runs' },
    { id: 'rbi', label: 'RBI' },
    { id: 'sb', label: 'Stolen Bases' },
  ]

  const pitcherTabs: { id: PitcherTab; label: string }[] = [
    { id: 'era', label: 'ERA' },
    { id: 'k', label: 'Strikeouts' },
  ]

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-text-primary">Hitters</h2>
            <p className="mt-1 text-xs text-text-secondary">
              Season 2026 ·{' '}
              <code className="rounded bg-surface px-1">game_boxscores</code> · min{' '}
              <strong>5 AB</strong> · Top {TOP_N}
              {onSelectPlayer ? ' · Click for game trends' : ''}
            </p>
          </div>
          <TabGroup tabs={hitterTabs} active={hitterTab} onChange={setHitterTab} />
        </div>
        <HitterTable2026 rows={topHitters} tab={hitterTab} onSelectPlayer={onSelectPlayer} />
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold text-text-primary">Pitchers</h2>
            <p className="mt-1 text-xs text-text-secondary">
              Season 2026 ·{' '}
              <code className="rounded bg-surface px-1">game_boxscores</code> · min{' '}
              <strong>3 IP</strong> · Top {TOP_N}
              {onSelectPlayer ? ' · Click for game trends' : ''}
            </p>
          </div>
          <TabGroup tabs={pitcherTabs} active={pitcherTab} onChange={pitcherTab => setPitcherTab(pitcherTab)} />
        </div>
        <PitcherTable2026 rows={topPitchers} tab={pitcherTab} onSelectPlayer={onSelectPlayer} />
      </section>

      {(hitters.length > 0 || pitchers.length > 0) && (
        <p className="text-xs text-text-muted">
          <span className="font-semibold text-text-secondary">*</span>{' '}
          Small sample — hitters &lt;10 AB · pitchers &lt;9 IP
        </p>
      )}
    </div>
  )
}
