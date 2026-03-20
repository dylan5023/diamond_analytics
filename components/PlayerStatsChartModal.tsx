'use client'

import { useEffect, type ReactNode } from 'react'
import useSWR from 'swr'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchPlayerStatsForCharts, fetchSeasonLeagueAverages } from '@/lib/dashboard-supabase'
import type { PlayerChartProfile, SeasonLeagueAverages } from '@/types'

const ACCENT = '#c9a84c'
const LEAGUE_LINE = '#22c55e'
const GRID = 'rgba(255,255,255,0.06)'
/** Chart axis / angle labels — brighter on dark modal */
const AXIS = '#d1dae3'
const TOOLTIP_LABEL = '#f1f5f9'
const TOOLTIP_ITEM = '#e8edf4'

const tooltipProps = {
  contentStyle: {
    background: '#1a1f2e',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    fontSize: 12,
    color: TOOLTIP_ITEM,
  },
  labelStyle: { color: TOOLTIP_LABEL },
  itemStyle: { color: TOOLTIP_ITEM },
}

const legendProps = {
  wrapperStyle: { fontSize: 11, paddingTop: 8 },
  formatter: (value: string) => <span className="text-white/88">{value}</span>,
}

/** Display numbers with 3 decimal places (charts + tooltips). */
function fmt3(v: unknown): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(3)
}

const chartTooltip = {
  ...tooltipProps,
  formatter: (value: unknown) => [fmt3(value), ''] as [string, string],
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/** 100 = league average; higher = better for the player (vs league). */
function indexVsLeagueLowerBetter(player: number, league: number | null | undefined): number {
  if (league == null || league <= 0 || !Number.isFinite(player)) return 100
  return clamp(100 * (league / Math.max(player, 1e-9)), 0, 200)
}

function indexVsLeagueHigherBetter(player: number, league: number | null | undefined): number {
  if (league == null || league <= 0 || !Number.isFinite(player)) return 100
  return clamp(100 * (player / league), 0, 200)
}

/** When no league row: rough 0–100 “shape” for display only (not comparable across seasons). */
function fallbackLowerBetter(player: number, badAt: number): number {
  if (!Number.isFinite(player)) return 50
  return clamp(100 * (1 - Math.min(player / badAt, 1)), 0, 100)
}

function fallbackHigherBetter(player: number, goodAt: number): number {
  if (!Number.isFinite(player)) return 50
  return clamp(100 * Math.min(player / goodAt, 1), 0, 100)
}

type PitchingRadarRow = {
  subject: string
  player: number
  leagueAvg: number
  rawPlayer: number | null
  rawLeague: number | null
}

function PitchingRadarTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: PitchingRadarRow }>
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  const rp = row.rawPlayer
  const rl = row.rawLeague
  return (
    <div
      className="rounded-lg border border-border/60 bg-[#1a1f2e] px-3 py-2 text-xs shadow-lg"
      style={{ ...tooltipProps.contentStyle }}
    >
      <p className="mb-1 font-semibold text-white">{row.subject}</p>
      <p className="text-white/88">
        Player: {rp == null || !Number.isFinite(rp) ? '—' : fmt3(rp)}
      </p>
      {rl != null && Number.isFinite(rl) ? (
        <p className="text-white/88">League avg: {fmt3(rl)}</p>
      ) : null}
      <p className="mt-1 text-[10px] text-white/65">{`Index vs league (100 = average): ${fmt3(row.player)}`}</p>
    </div>
  )
}

function ChartBlock({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface/50 p-4">
      <h4 className="mb-1 font-heading text-xs font-bold uppercase tracking-wider text-white/90">{title}</h4>
      {hint ? <p className="mb-3 text-[10px] text-white/70">{hint}</p> : <div className="mb-3" />}
      {children}
    </div>
  )
}

function HittingCharts({
  h,
  league,
}: {
  h: NonNullable<PlayerChartProfile['hitting']>
  league: SeasonLeagueAverages['hitting'] | null | undefined
}) {
  const rate = [
    { name: 'AVG', value: h.avg, league: league?.avg ?? null },
    { name: 'OBP', value: h.obp ?? h.avg, league: league?.obp ?? null },
    { name: 'SLG', value: h.slg ?? 0, league: league?.slg ?? null },
    { name: 'OPS', value: h.ops, league: league?.ops ?? null },
  ]

  const rateMax = Math.min(
    1.95,
    Math.max(
      1.05,
      Math.max(
        ...rate.flatMap(r => [r.value, r.league ?? 0]),
        0.35
      ) * 1.12
    )
  )

  const counting = [
    { name: 'HR', value: h.home_runs, league: league?.home_runs ?? null },
    { name: 'RBI', value: h.rbi, league: league?.rbi ?? null },
    ...(h.hits != null ? [{ name: 'H', value: Math.round(h.hits), league: league?.hits ?? null }] : []),
    ...(h.at_bats != null ? [{ name: 'AB', value: Math.round(h.at_bats), league: league?.at_bats ?? null }] : []),
  ]

  const countMax = Math.max(...counting.flatMap(c => [c.value, c.league ?? 0]), 1)
  const countYMax = Math.max(countMax * 1.12, 1)

  const showLeague = league != null

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChartBlock
        title="Rate stats"
        hint={showLeague ? 'Green line = season average (qualified hitters, same AB cutoff as leaderboards).' : undefined}
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rate} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: AXIS, fontSize: 11 }} axisLine={{ stroke: GRID }} />
              <YAxis
                domain={[0, rateMax]}
                tick={{ fill: AXIS, fontSize: 11 }}
                axisLine={{ stroke: GRID }}
                tickFormatter={v => fmt3(v)}
              />
              <Tooltip {...chartTooltip} />
              <Legend {...legendProps} />
              <Bar dataKey="value" name="Player" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={48} />
              {showLeague ? (
                <Line
                  type="monotone"
                  dataKey="league"
                  name="Season avg"
                  stroke={LEAGUE_LINE}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: LEAGUE_LINE, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock>
      <ChartBlock
        title="Counting stats"
        hint={showLeague ? 'Green line = mean counting stats among qualified hitters.' : undefined}
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={counting} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: AXIS, fontSize: 11 }} axisLine={{ stroke: GRID }} />
              <YAxis
                domain={[0, countYMax]}
                tick={{ fill: AXIS, fontSize: 11 }}
                axisLine={{ stroke: GRID }}
                allowDecimals
                tickFormatter={v => fmt3(v)}
              />
              <Tooltip {...chartTooltip} />
              <Legend {...legendProps} />
              <Bar dataKey="value" name="Player" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={48} />
              {showLeague ? (
                <Line
                  type="monotone"
                  dataKey="league"
                  name="Season avg"
                  stroke={LEAGUE_LINE}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: LEAGUE_LINE, strokeWidth: 0 }}
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock>
    </div>
  )
}

function PitchingCharts({
  p,
  league,
}: {
  p: NonNullable<PlayerChartProfile['pitching']>
  league: SeasonLeagueAverages['pitching'] | null | undefined
}) {
  const hasLeague = league != null

  const rows: PitchingRadarRow[] = []

  if (p.era != null) {
    const rawP = p.era
    const rawL = league?.era ?? null
    const player = hasLeague
      ? indexVsLeagueLowerBetter(rawP, rawL)
      : fallbackLowerBetter(rawP, 6)
    rows.push({
      subject: 'ERA',
      player,
      leagueAvg: 100,
      rawPlayer: rawP,
      rawLeague: rawL,
    })
  }
  if (p.whip != null) {
    const rawP = p.whip
    const rawL = league?.whip ?? null
    const player = hasLeague
      ? indexVsLeagueLowerBetter(rawP, rawL)
      : fallbackLowerBetter(rawP, 2)
    rows.push({
      subject: 'WHIP',
      player,
      leagueAvg: 100,
      rawPlayer: rawP,
      rawLeague: rawL,
    })
  }
  if (p.innings_pitched != null) {
    const rawP = p.innings_pitched
    const rawL = league?.innings_pitched ?? null
    const player = hasLeague
      ? indexVsLeagueHigherBetter(rawP, rawL)
      : fallbackHigherBetter(rawP, 200)
    rows.push({
      subject: 'IP',
      player,
      leagueAvg: 100,
      rawPlayer: rawP,
      rawLeague: rawL,
    })
  }
  if (p.strikeouts != null) {
    const rawP = p.strikeouts
    const rawL = league?.strikeouts ?? null
    const player = hasLeague
      ? indexVsLeagueHigherBetter(rawP, rawL)
      : fallbackHigherBetter(rawP, 300)
    rows.push({
      subject: 'K',
      player,
      leagueAvg: 100,
      rawPlayer: rawP,
      rawLeague: rawL,
    })
  }
  if (p.wins != null) {
    const rawP = p.wins
    const rawL = league?.wins ?? null
    const player = hasLeague
      ? indexVsLeagueHigherBetter(rawP, rawL)
      : fallbackHigherBetter(rawP, 25)
    rows.push({
      subject: 'W',
      player,
      leagueAvg: 100,
      rawPlayer: rawP,
      rawLeague: rawL,
    })
  }
  if (p.losses != null) {
    const rawP = p.losses
    const rawL = league?.losses ?? null
    const player = hasLeague
      ? indexVsLeagueLowerBetter(rawP, rawL)
      : fallbackLowerBetter(rawP, 20)
    rows.push({
      subject: 'L',
      player,
      leagueAvg: 100,
      rawPlayer: rawP,
      rawLeague: rawL,
    })
  }

  if (rows.length < 3) {
    return (
      <p className="text-sm text-white/85">
        Not enough pitching stats to draw a radar (need at least 3 categories).
      </p>
    )
  }

  const radarHint = hasLeague
    ? 'Each axis is indexed vs qualified-pitcher season averages: 100 = league average. ERA/WHIP/L: lower raw is better (outward = better). IP/K/W: higher is better. L: fewer is better.'
    : 'League averages unavailable — rough scale per axis (for shape only).'

  return (
    <ChartBlock title="Pitching profile (radar)" hint={radarHint}>
      <div className="h-80 w-full min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="52%" outerRadius="78%" data={rows}>
            <PolarGrid stroke={GRID} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: AXIS, fontSize: 11 }} />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 200]}
              tick={{ fill: AXIS, fontSize: 10 }}
              tickFormatter={v => (v === 100 ? '100 (avg)' : String(v))}
            />
            <Tooltip content={<PitchingRadarTooltip />} />
            <Legend {...legendProps} />
            <Radar
              name="Player (index)"
              dataKey="player"
              stroke={ACCENT}
              fill={ACCENT}
              fillOpacity={0.35}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            {hasLeague ? (
              <Radar
                name="League avg (100)"
                dataKey="leagueAvg"
                stroke={LEAGUE_LINE}
                fill={LEAGUE_LINE}
                fillOpacity={0.08}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            ) : null}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </ChartBlock>
  )
}

interface Props {
  playerId: number
  onClose: () => void
}

export default function PlayerStatsChartModal({ playerId, onClose }: Props) {
  const { data, error, isLoading } = useSWR(
    ['player-chart', playerId],
    () => fetchPlayerStatsForCharts(playerId)
  )

  const season = data?.season
  const { data: leagueAvgs } = useSWR(
    season != null ? ['season-league-avg', season] : null,
    () => fetchSeasonLeagueAverages(season!)
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close modal"
      />
      <div
        className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-[#141820] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-chart-title"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="player-chart-title" className="font-heading text-xl font-bold text-white">
              {isLoading ? 'Loading…' : data?.full_name ?? 'Player stats'}
            </h2>
            {!isLoading && data && (
              <p className="mt-1 text-sm text-white/85">
                Season {data.season} · {data.team} · {data.position}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        {isLoading && (
          <div className="h-64 animate-pulse rounded-xl bg-surface" aria-busy />
        )}

        {error && (
          <p className="text-sm text-red-400">Could not load player stats. Try again later.</p>
        )}

        {!isLoading && !error && data === null && (
          <p className="text-sm text-white/85">No roster or stats found for this player.</p>
        )}

        {!isLoading && !error && data && !data.hitting && !data.pitching && (
          <p className="text-sm text-white/85">
            No <code className="rounded bg-white/10 px-1 text-accent-light">player_stats</code> rows for season{' '}
            {data.season}.
          </p>
        )}

        {!isLoading && !error && data?.hitting && (
          <section>
            <h3 className="mb-4 font-heading text-sm font-bold uppercase tracking-wider text-white/88">Hitting</h3>
            <HittingCharts h={data.hitting} league={leagueAvgs?.hitting} />
          </section>
        )}

        {!isLoading && !error && data?.pitching && (
          <section className={data.hitting ? 'mt-8' : ''}>
            <h3 className="mb-4 font-heading text-sm font-bold uppercase tracking-wider text-white/88">Pitching</h3>
            <PitchingCharts p={data.pitching} league={leagueAvgs?.pitching} />
          </section>
        )}
      </div>
    </div>
  )
}
