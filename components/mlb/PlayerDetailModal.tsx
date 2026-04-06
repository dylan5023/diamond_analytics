'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import {
  getLeagueHittingAverages,
  getLeaguePitchingAverages,
  type LeagueHittingAverages,
  type LeaguePitchingAverages,
} from '@/lib/mlb-league-avg'
import type { TeamRosterRow, PlayerSeasonStatRow, GameBoxscoreRow } from '@/types/mlb'
import MlbModal from './MlbModal'

interface Props {
  playerId: number
  /** When set, Dashboard link includes `gamePk` so the chart modal can navigate back to this game. */
  gamePk?: number | null
  onClose: () => void
}

function formatShortDate(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function PlayerDetailModal({ playerId, gamePk, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roster, setRoster] = useState<TeamRosterRow | null>(null)
  const [hitting2025, setHitting2025] = useState<PlayerSeasonStatRow | null>(null)
  const [hitting2026Stats, setHitting2026Stats] = useState<PlayerSeasonStatRow | null>(null)
  const [pitching2025, setPitching2025] = useState<PlayerSeasonStatRow | null>(null)
  const [pitching2026Stats, setPitching2026Stats] = useState<PlayerSeasonStatRow | null>(null)
  const [recentGames, setRecentGames] = useState<GameBoxscoreRow[]>([])
  const [leagueHit2025, setLeagueHit2025] = useState<LeagueHittingAverages | null>(null)
  const [leaguePit2025, setLeaguePit2025] = useState<LeaguePitchingAverages | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      setLeagueHit2025(null)
      setLeaguePit2025(null)
      try {
        const [rosterRes, statsRes, box2026Res, leagueHit, leaguePit] = await Promise.all([
          // team_rosters PK is (player_id, team_id); multiple rows possible. For profile name, any row’s full_name is enough.
          supabase.from('team_rosters').select('*').eq('player_id', playerId).limit(1).maybeSingle(),
          supabase
            .from('player_stats')
            .select('*')
            .eq('player_id', playerId)
            .in('season', [2025, 2026])
            .order('season', { ascending: false }),
          supabase
            .from('game_boxscores')
            .select('*')
            .eq('player_id', playerId)
            .gte('game_date', '2026-01-01')
            .lt('game_date', '2027-01-01')
            .order('game_date', { ascending: false })
            .limit(500),
          getLeagueHittingAverages(supabase, 2025).catch(() => null),
          getLeaguePitchingAverages(supabase, 2025).catch(() => null),
        ])

        if (rosterRes.error) throw rosterRes.error
        if (statsRes.error) throw statsRes.error
        if (box2026Res.error) throw box2026Res.error
        if (cancelled) return

        setLeagueHit2025(leagueHit)
        setLeaguePit2025(leaguePit)

        setRoster((rosterRes.data ?? null) as TeamRosterRow | null)

        const statRows = (statsRes.data ?? []) as PlayerSeasonStatRow[]
        let h25: PlayerSeasonStatRow | null = null
        let h26: PlayerSeasonStatRow | null = null
        let p25: PlayerSeasonStatRow | null = null
        let p26: PlayerSeasonStatRow | null = null
        for (const r of statRows) {
          if (r.stat_group === 'hitting' && r.season === 2025 && !h25) h25 = r
          if (r.stat_group === 'hitting' && r.season === 2026 && !h26) h26 = r
          if (r.stat_group === 'pitching' && r.season === 2025 && !p25) p25 = r
          if (r.stat_group === 'pitching' && r.season === 2026 && !p26) p26 = r
        }
        setHitting2025(h25)
        setHitting2026Stats(h26)
        setPitching2025(p25)
        setPitching2026Stats(p26)

        setRecentGames((box2026Res.data ?? []) as GameBoxscoreRow[])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [playerId])

  /** 2026 game_boxscores rows (avoid name clash with hitting2026Stats from player_stats) */
  const hittingBox2026 = useMemo(
    () => recentGames.filter(g => g.stat_group === 'hitting'),
    [recentGames]
  )
  const pitchingBox2026 = useMemo(
    () => recentGames.filter(g => g.stat_group === 'pitching'),
    [recentGames]
  )

  const chartHitting = useMemo(() => {
    return hittingBox2026
      .slice(0, 10)
      .slice()
      .reverse()
      .map(g => ({
        label: formatShortDate(g.game_date),
        hits: g.hits ?? 0,
        hr: g.home_runs ?? 0,
        ab: g.at_bats ?? 0,
        rbi: g.rbi ?? 0,
        bb: g.walks ?? 0,
      }))
  }, [hittingBox2026])

  const chartPitching = useMemo(() => {
    return pitchingBox2026
      .slice(0, 10)
      .slice()
      .reverse()
      .map(g => ({
        label: formatShortDate(g.game_date),
        ip: typeof g.innings_pitched === 'number' ? g.innings_pitched : Number(g.innings_pitched) || 0,
        k: g.strikeouts ?? 0,
        er: g.earned_runs ?? 0,
        bb: g.walks ?? 0,
      }))
  }, [pitchingBox2026])

  /** Show chart with any 2026 games; message only when there are zero rows */
  const showHittingChart = chartHitting.length > 0
  const showPitchingChart = chartPitching.length > 0
  const showHittingAccumulatingMsg = hittingBox2026.length === 0
  const showPitchingAccumulatingMsg = pitchingBox2026.length === 0

  const title = roster?.full_name ?? `Player ${playerId}`

  return (
    <MlbModal title={title} onClose={onClose} wide stacked>
      <div className="mb-5">
        <Link
          href={
            gamePk != null && gamePk > 0
              ? `/dashboard?player=${playerId}&gamePk=${gamePk}`
              : `/dashboard?player=${playerId}`
          }
          className="inline-flex items-center gap-2 rounded-lg border border-[#facc15]/40 bg-[#facc15]/10 px-4 py-2.5 text-sm font-semibold text-[#facc15] transition-colors hover:border-[#facc15]/60 hover:bg-[#facc15]/18 hover:text-white"
        >
          Season stats & charts on Dashboard
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
      {loading && (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-lg bg-white/10" />
          <div className="h-32 animate-pulse rounded-lg bg-white/10" />
          <div className="h-48 animate-pulse rounded-lg bg-white/10" />
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && !error && (
        <div className="space-y-10">
          {roster && (
            <section className="rounded-2xl border border-white/[0.1] bg-[#0f1117] p-5 sm:p-6">
              <h3 className="mb-1 font-heading text-xs font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">
                Profile
              </h3>
              <p className="font-heading text-2xl font-bold tracking-tight text-white">{roster.full_name}</p>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="border-b border-white/[0.06] pb-3 sm:border-0 sm:pb-0">
                  <dt className="text-xs font-medium text-slate-500">Team</dt>
                  <dd className="mt-1 text-base font-medium text-slate-100">
                    {roster.team_abbr ?? roster.team_name ?? '—'}
                  </dd>
                </div>
                <div className="border-b border-white/[0.06] pb-3 sm:border-0 sm:pb-0">
                  <dt className="text-xs font-medium text-slate-500">Position</dt>
                  <dd className="mt-1 text-base font-medium text-slate-100">{roster.position ?? '—'}</dd>
                </div>
                <div className="border-b border-white/[0.06] pb-3 sm:border-0 sm:pb-0">
                  <dt className="text-xs font-medium text-slate-500">Jersey</dt>
                  <dd className="mt-1 text-base font-medium text-slate-100">#{roster.jersey_number ?? '—'}</dd>
                </div>
                <div className="border-b border-white/[0.06] pb-3 sm:border-0 sm:pb-0">
                  <dt className="text-xs font-medium text-slate-500">Bats / Throws</dt>
                  <dd className="mt-1 text-base font-medium text-slate-100">
                    {roster.bats ?? '—'} / {roster.throws ?? '—'}
                  </dd>
                </div>
                <div className="border-b border-white/[0.06] pb-3 sm:border-0 sm:pb-0">
                  <dt className="text-xs font-medium text-slate-500">Born</dt>
                  <dd className="mt-1 text-base font-medium text-slate-100">
                    {roster.birth_date
                      ? new Date(roster.birth_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Height / Weight</dt>
                  <dd className="mt-1 text-base font-medium text-slate-100">
                    {roster.height ?? '—'} · {roster.weight ?? '—'}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {(hitting2025 || hitting2026Stats) && (
            <section>
              <h3 className="font-heading text-lg font-semibold text-white">Season hitting</h3>
              <p className="mt-1 text-sm text-slate-400">Full-year stats from the league database.</p>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {hitting2025 && (
                  <div>
                    <p className="mb-3 text-sm font-semibold text-[#facc15]">2025 · Full season</p>
                    {leagueHit2025 && (
                      <p className="mb-3 text-xs leading-relaxed text-slate-500">
                        Compared to 2025 league rates from this database (all player rows; AVG/SLG
                        weighted by AB; OBP uses (H+BB)/(AB+BB)).
                      </p>
                    )}
                    <div
                      className="grid grid-cols-2 gap-4 rounded-xl border border-white/[0.1] bg-[#0f1117] p-5 sm:grid-cols-3"
                    >
                      <StatVsLeague
                        label="AVG"
                        player={hitting2025.avg}
                        league={leagueHit2025?.avg}
                        higherIsBetter
                      />
                      <StatVsLeague
                        label="OBP"
                        player={hitting2025.obp}
                        league={leagueHit2025?.obp}
                        higherIsBetter
                      />
                      <StatVsLeague
                        label="SLG"
                        player={hitting2025.slg}
                        league={leagueHit2025?.slg}
                        higherIsBetter
                      />
                      <StatVsLeague
                        label="OPS"
                        player={hitting2025.ops}
                        league={leagueHit2025?.ops}
                        higherIsBetter
                        showOpsIndex
                      />
                      <Stat label="HR" value={hitting2025.home_runs ?? '—'} />
                      <Stat label="RBI" value={hitting2025.rbi ?? '—'} />
                    </div>
                  </div>
                )}
                {hitting2026Stats && (
                  <div>
                    <p className="mb-3 text-sm font-semibold text-[#facc15]">2026 · Season to date</p>
                    <div
                      className="grid grid-cols-2 gap-4 rounded-xl border border-white/[0.1] bg-[#0f1117] p-5 sm:grid-cols-3"
                    >
                      <Stat label="AVG" value={fmt2(hitting2026Stats.avg)} />
                      <Stat label="OBP" value={fmt2(hitting2026Stats.obp)} />
                      <Stat label="SLG" value={fmt2(hitting2026Stats.slg)} />
                      <Stat label="OPS" value={fmt2(hitting2026Stats.ops)} />
                      <Stat label="HR" value={hitting2026Stats.home_runs ?? '—'} />
                      <Stat label="RBI" value={hitting2026Stats.rbi ?? '—'} />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {(pitching2025 || pitching2026Stats) && (
            <section>
              <h3 className="font-heading text-lg font-semibold text-white">Season pitching</h3>
              <p className="mt-1 text-sm text-slate-400">Full-year stats from the league database.</p>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {pitching2025 && (
                  <div>
                    <p className="mb-3 text-sm font-semibold text-[#facc15]">2025 · Full season</p>
                    {leaguePit2025 && (
                      <p className="mb-3 text-xs leading-relaxed text-slate-500">
                        Compared to 2025 league rates from this database (ERA / WHIP weighted by IP
                        across all pitcher rows).
                      </p>
                    )}
                    <div
                      className="grid grid-cols-2 gap-4 rounded-xl border border-white/[0.1] bg-[#0f1117] p-5 sm:grid-cols-3"
                    >
                      <StatVsLeague
                        label="ERA"
                        player={pitching2025.era}
                        league={leaguePit2025?.era}
                        higherIsBetter={false}
                      />
                      <StatVsLeague
                        label="WHIP"
                        player={pitching2025.whip}
                        league={leaguePit2025?.whip}
                        higherIsBetter={false}
                      />
                      <Stat label="W" value={pitching2025.wins ?? '—'} />
                      <Stat label="L" value={pitching2025.losses ?? '—'} />
                      <Stat label="K" value={pitching2025.strikeouts ?? '—'} />
                      <Stat label="BB" value={pitching2025.bb ?? pitching2025.walks ?? '—'} />
                    </div>
                  </div>
                )}
                {pitching2026Stats && (
                  <div>
                    <p className="mb-3 text-sm font-semibold text-[#facc15]">2026 · Season to date</p>
                    <div
                      className="grid grid-cols-2 gap-4 rounded-xl border border-white/[0.1] bg-[#0f1117] p-5 sm:grid-cols-3"
                    >
                      <Stat label="ERA" value={fmt2(pitching2026Stats.era)} />
                      <Stat label="WHIP" value={fmt2(pitching2026Stats.whip)} />
                      <Stat label="W" value={pitching2026Stats.wins ?? '—'} />
                      <Stat label="L" value={pitching2026Stats.losses ?? '—'} />
                      <Stat label="K" value={pitching2026Stats.strikeouts ?? '—'} />
                      <Stat label="BB" value={pitching2026Stats.bb ?? pitching2026Stats.walks ?? '—'} />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {!hitting2025 && !hitting2026Stats && !pitching2025 && !pitching2026Stats && (
            <p className="rounded-xl border border-dashed border-white/10 bg-[#0f1117]/80 px-4 py-3 text-sm text-slate-400">
              No season stats in the database for 2025–2026 yet.
            </p>
          )}

          {(hitting2025 || hitting2026Stats || hittingBox2026.length > 0) && (
            <section>
              <h3 className="font-heading text-lg font-semibold text-white">2026 · Game trends (hitting)</h3>
              <p className="mt-1 text-sm text-slate-400">Last 10 games — bars = hits, red line = home runs.</p>
              {showHittingAccumulatingMsg && (
                <p className="mt-4 rounded-xl border border-white/[0.1] bg-[#0f1117] px-4 py-4 text-sm leading-relaxed text-slate-300">
                  No 2026 game rows yet — numbers will fill in as the season progresses.
                </p>
              )}
              {showHittingChart && (
                <div className="mt-5 space-y-4">
                  <div className="h-64 w-full min-w-0 rounded-xl border border-white/[0.1] bg-[#0f1117] p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartHitting} margin={{ top: 8, right: 36, left: 0, bottom: 4 }}>
                        <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.5} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: '#334155' }}
                        />
                        <YAxis
                          yAxisId="hits"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          width={24}
                          allowDecimals={false}
                        />
                        <YAxis
                          yAxisId="hr"
                          orientation="right"
                          tick={{ fill: '#f87171', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          width={24}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '12px',
                            fontSize: '13px',
                            padding: '10px 14px',
                          }}
                          labelStyle={{ color: '#e2e8f0', marginBottom: 6, fontWeight: 600 }}
                          formatter={(value: number, name: string) => {
                            if (name === 'Hits') return [`${value} H`, 'Hits']
                            if (name === 'HR') return [`${value} HR`, 'Home Runs']
                            if (name === 'RBI') return [`${value}`, 'RBI']
                            if (name === 'BB') return [`${value}`, 'Walks']
                            return [value, name]
                          }}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: 12, fontSize: 12, color: '#94a3b8' }}
                          formatter={(value) => <span style={{ color: '#cbd5e1' }}>{value}</span>}
                        />
                        <Bar
                          yAxisId="hits"
                          dataKey="hits"
                          name="Hits"
                          fill="#facc15"
                          radius={[4, 4, 0, 0]}
                          opacity={0.85}
                          maxBarSize={40}
                        />
                        <Line
                          yAxisId="hr"
                          type="monotone"
                          dataKey="hr"
                          name="HR"
                          stroke="#f87171"
                          strokeWidth={2}
                          dot={{ r: 5, fill: '#f87171', stroke: '#1e293b', strokeWidth: 2 }}
                          activeDot={{ r: 7 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-white/[0.1] bg-[#0f1117]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.08]">
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">AB</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-[#facc15]/70">H</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-red-400/70">HR</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">RBI</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">BB</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">AVG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hittingBox2026.slice(0, 10).map(g => (
                          <tr key={g.game_pk} className="border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.03]">
                            <td className="px-3 py-2.5 text-slate-300">{formatShortDate(g.game_date)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-400">{g.at_bats ?? '—'}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-bold text-[#facc15]">{g.hits ?? '—'}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-red-400">{g.home_runs ?? '—'}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{g.rbi ?? '—'}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{g.walks ?? '—'}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-400">{g.avg != null ? g.avg.toFixed(3) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {(pitching2025 || pitching2026Stats || pitchingBox2026.length > 0) && (
            <section>
              <h3 className="font-heading text-lg font-semibold text-white">2026 · Game trends (pitching)</h3>
              <p className="mt-1 text-sm text-slate-400">Last 10 starts — bars = strikeouts, yellow line = innings pitched.</p>
              {showPitchingAccumulatingMsg && (
                <p className="mt-4 rounded-xl border border-white/[0.1] bg-[#0f1117] px-4 py-4 text-sm leading-relaxed text-slate-300">
                  No 2026 game rows yet — numbers will fill in as the season progresses.
                </p>
              )}
              {showPitchingChart && (
                <div className="mt-5 space-y-4">
                  <div className="h-64 w-full min-w-0 rounded-xl border border-white/[0.1] bg-[#0f1117] p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartPitching} margin={{ top: 8, right: 36, left: 0, bottom: 4 }}>
                        <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.5} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: '#334155' }}
                        />
                        <YAxis
                          yAxisId="k"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          width={24}
                          allowDecimals={false}
                        />
                        <YAxis
                          yAxisId="ip"
                          orientation="right"
                          tick={{ fill: '#facc15', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          width={24}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '12px',
                            fontSize: '13px',
                            padding: '10px 14px',
                          }}
                          labelStyle={{ color: '#e2e8f0', marginBottom: 6, fontWeight: 600 }}
                          formatter={(value: number, name: string) => {
                            if (name === 'K') return [`${value}`, 'Strikeouts']
                            if (name === 'IP') return [`${value}`, 'Innings Pitched']
                            if (name === 'ER') return [`${value}`, 'Earned Runs']
                            if (name === 'BB') return [`${value}`, 'Walks']
                            return [value, name]
                          }}
                        />
                        <Legend
                          wrapperStyle={{ paddingTop: 12, fontSize: 12, color: '#94a3b8' }}
                          formatter={(value) => <span style={{ color: '#cbd5e1' }}>{value}</span>}
                        />
                        <Bar
                          yAxisId="k"
                          dataKey="k"
                          name="K"
                          fill="#818cf8"
                          radius={[4, 4, 0, 0]}
                          opacity={0.85}
                          maxBarSize={40}
                        />
                        <Line
                          yAxisId="ip"
                          type="monotone"
                          dataKey="ip"
                          name="IP"
                          stroke="#facc15"
                          strokeWidth={2}
                          dot={{ r: 5, fill: '#facc15', stroke: '#1e293b', strokeWidth: 2 }}
                          activeDot={{ r: 7 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-white/[0.1] bg-[#0f1117]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.08]">
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-[#facc15]/70">IP</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-indigo-400/70">K</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-red-400/70">ER</th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">BB</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pitchingBox2026.slice(0, 10).map(g => (
                          <tr key={g.game_pk} className="border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.03]">
                            <td className="px-3 py-2.5 text-slate-300">{formatShortDate(g.game_date)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-bold text-[#facc15]">
                              {g.innings_pitched != null ? Number(g.innings_pitched).toFixed(1) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums font-bold text-indigo-400">{g.strikeouts ?? '—'}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-red-400">{g.earned_runs ?? '—'}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{g.walks ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </MlbModal>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 font-heading text-2xl font-bold tabular-nums tracking-tight text-white">{value}</p>
    </div>
  )
}

function StatVsLeague({
  label,
  player,
  league,
  higherIsBetter,
  showOpsIndex,
}: {
  label: string
  player: number | null | undefined
  league: number | null | undefined
  higherIsBetter: boolean
  showOpsIndex?: boolean
}) {
  const p =
    player != null && typeof player === 'number' && !Number.isNaN(player) ? player : null
  const lg = league != null && typeof league === 'number' && !Number.isNaN(league) ? league : null
  const showCmp = p != null && lg != null
  const diff = showCmp ? p - lg : null
  const good =
    diff == null ? null : higherIsBetter ? diff > 0 : diff < 0
  const diffText =
    diff == null ? null : `${diff >= 0 ? '+' : ''}${diff.toFixed(3)}`

  const opsIndex =
    showOpsIndex && showCmp && lg > 0 ? Math.round((p / lg) * 100) : null

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 font-heading text-2xl font-bold tabular-nums tracking-tight text-white">
        {fmt2(player)}
      </p>
      {showCmp && (
        <p
          className={`mt-1 text-xs tabular-nums ${
            good ? 'text-emerald-400' : diff === 0 ? 'text-slate-500' : 'text-rose-400'
          }`}
        >
          Lg {fmt2(lg)} · {diffText}
        </p>
      )}
      {opsIndex != null && (
        <p className="mt-0.5 text-[11px] text-slate-500">vs Lg OPS index {opsIndex} (100 = avg)</p>
      )}
    </div>
  )
}

function fmt2(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toFixed(3)
}
