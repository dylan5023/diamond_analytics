'use client'

import { useEffect, useState, useMemo, type ReactNode } from 'react'
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import {
  getLeagueHittingAverages,
  getLeaguePitchingAverages,
  type LeagueHittingAverages,
  type LeaguePitchingAverages,
} from '@/lib/mlb-league-avg'
import {
  fetchLeague2026HittingAvg,
  fetchLeague2026PitchingAvg,
  type League2026HittingAvg,
  type League2026PitchingAvg,
} from '@/lib/season-stats'
import { fetchPlayerStatsForCharts, fetchSeasonLeagueAverages } from '@/lib/dashboard-supabase'
import type { PlayerChartProfile, SeasonLeagueAverages } from '@/types'
import type { TeamRosterRow, PlayerSeasonStatRow, GameBoxscoreRow } from '@/types/mlb'
import MlbModal from './MlbModal'

interface Props {
  playerId: number
  gamePk?: number | null
  /** 어디서 열었냐에 따라 초기 시즌 결정 (기본값: 2026) */
  initialSeason?: 2025 | 2026
  onClose: () => void
  /** 제공 시 헤더에 ← 뒤로 가기 버튼 표시 */
  onBack?: () => void
}

function formatShortDate(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function nv(v: unknown): number {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

export default function PlayerDetailModal({ playerId, gamePk, initialSeason = 2026, onClose, onBack }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 현재 보이는 시즌 (버튼으로 전환 가능)
  const [viewSeason, setViewSeason] = useState<2025 | 2026>(initialSeason)

  // 데이터
  const [roster, setRoster] = useState<TeamRosterRow | null>(null)
  const [recentGames, setRecentGames] = useState<GameBoxscoreRow[]>([])
  const [hitting2025, setHitting2025] = useState<PlayerSeasonStatRow | null>(null)
  const [pitching2025, setPitching2025] = useState<PlayerSeasonStatRow | null>(null)
  const [leagueHit2025, setLeagueHit2025] = useState<LeagueHittingAverages | null>(null)
  const [leaguePit2025, setLeaguePit2025] = useState<LeaguePitchingAverages | null>(null)
  const [leagueHit2026, setLeagueHit2026] = useState<League2026HittingAvg | null>(null)
  const [leaguePit2026, setLeaguePit2026] = useState<League2026PitchingAvg | null>(null)
  // 2025 bar/radar 차트용
  const [chartProfile, setChartProfile] = useState<PlayerChartProfile | null>(null)
  const [chartLeague, setChartLeague] = useState<SeasonLeagueAverages | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setViewSeason(initialSeason)

    async function load() {
      try {
        const [rosterRes, statsRes, boxRes, lgHit25, lgPit25, lgHit26, lgPit26, chartProf, chartLg] = await Promise.all([
          supabase.from('team_rosters').select('*').eq('player_id', playerId).limit(1).maybeSingle(),
          supabase.from('player_stats').select('*').eq('player_id', playerId).eq('season', 2025),
          supabase
            .from('game_boxscores').select('*')
            .eq('player_id', playerId)
            .gte('game_date', '2026-01-01').lt('game_date', '2027-01-01')
            .order('game_date', { ascending: false }).limit(500),
          getLeagueHittingAverages(supabase, 2025).catch(() => null),
          getLeaguePitchingAverages(supabase, 2025).catch(() => null),
          fetchLeague2026HittingAvg(5).catch(() => null),
          fetchLeague2026PitchingAvg(3).catch(() => null),
          fetchPlayerStatsForCharts(playerId).catch(() => null),
          fetchSeasonLeagueAverages(2025).catch(() => null),
        ])

        if (rosterRes.error) throw rosterRes.error
        if (statsRes.error) throw statsRes.error
        if (boxRes.error) throw boxRes.error
        if (cancelled) return

        setRoster((rosterRes.data ?? null) as TeamRosterRow | null)
        setRecentGames((boxRes.data ?? []) as GameBoxscoreRow[])

        let h25: PlayerSeasonStatRow | null = null
        let p25: PlayerSeasonStatRow | null = null
        for (const r of (statsRes.data ?? []) as PlayerSeasonStatRow[]) {
          if (r.stat_group === 'hitting' && !h25) h25 = r
          if (r.stat_group === 'pitching' && !p25) p25 = r
        }
        setHitting2025(h25)
        setPitching2025(p25)
        setLeagueHit2025(lgHit25)
        setLeaguePit2025(lgPit25)
        setLeagueHit2026(lgHit26)
        setLeaguePit2026(lgPit26)
        setChartProfile(chartProf ?? null)
        setChartLeague(chartLg ?? null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [playerId, initialSeason])

  // ── 2026 game_boxscores 집계 ───────────────────────────────────────────────
  const hittingBox2026 = useMemo(() => recentGames.filter(g => g.stat_group === 'hitting'), [recentGames])
  const pitchingBox2026 = useMemo(() => recentGames.filter(g => g.stat_group === 'pitching'), [recentGames])

  const hitting2026Agg = useMemo(() => {
    if (hittingBox2026.length === 0) return null
    const ab = hittingBox2026.reduce((s, g) => s + nv(g.at_bats), 0)
    const h = hittingBox2026.reduce((s, g) => s + nv(g.hits), 0)
    const hr = hittingBox2026.reduce((s, g) => s + nv(g.home_runs), 0)
    const rbi = hittingBox2026.reduce((s, g) => s + nv(g.rbi), 0)
    const bb = hittingBox2026.reduce((s, g) => s + nv(g.walks), 0)
    const sb = hittingBox2026.reduce((s, g) => s + nv(g.stolen_bases), 0)
    return {
      ab, h, hr, rbi, bb, sb,
      avg: ab > 0 ? h / ab : 0,
      obp: (ab + bb) > 0 ? (h + bb) / (ab + bb) : 0,
      games: new Set(hittingBox2026.map(g => g.game_pk)).size,
    }
  }, [hittingBox2026])

  const pitching2026Agg = useMemo(() => {
    if (pitchingBox2026.length === 0) return null
    const ip = pitchingBox2026.reduce((s, g) => s + nv(g.innings_pitched), 0)
    const er = pitchingBox2026.reduce((s, g) => s + nv(g.earned_runs), 0)
    const k = pitchingBox2026.reduce((s, g) => s + nv(g.strikeouts), 0)
    const bb = pitchingBox2026.reduce((s, g) => s + nv(g.walks), 0)
    return {
      ip: Math.round(ip * 10) / 10, er, k, bb,
      era: ip > 0 ? (er * 9) / ip : 0,
      games: new Set(pitchingBox2026.map(g => g.game_pk)).size,
    }
  }, [pitchingBox2026])

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartHitting = useMemo(() =>
    hittingBox2026.slice(0, 10).slice().reverse().map(g => ({
      label: formatShortDate(g.game_date),
      hits: g.hits ?? 0,
      hr: g.home_runs ?? 0,
    })), [hittingBox2026])

  const chartPitching = useMemo(() =>
    pitchingBox2026.slice(0, 10).slice().reverse().map(g => ({
      label: formatShortDate(g.game_date),
      ip: typeof g.innings_pitched === 'number' ? g.innings_pitched : Number(g.innings_pitched) || 0,
      k: g.strikeouts ?? 0,
    })), [pitchingBox2026])

  const title = roster?.full_name ?? `Player ${playerId}`
  const has2026Data = hitting2026Agg || pitching2026Agg
  const has2025Data = hitting2025 || pitching2025

  return (
    <MlbModal title={title} onClose={onClose} wide stacked onBack={onBack} backLabel="Back to game">
      {loading && (
        <div className="space-y-4">
          <div className="h-28 animate-pulse rounded-xl bg-white/10" />
          <div className="h-44 animate-pulse rounded-xl bg-white/10" />
          <div className="h-64 animate-pulse rounded-xl bg-white/10" />
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="space-y-8">

          {/* ── 프로필 ── */}
          {roster && (
            <section className="rounded-2xl border border-white/[0.1] bg-[#0f1117] p-5 sm:p-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">Profile</p>
              <p className="font-heading text-2xl font-bold tracking-tight text-white">{roster.full_name}</p>
              <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-3">
                <InfoItem label="Team" value={roster.team_abbr ?? roster.team_name ?? '—'} />
                <InfoItem label="Position" value={roster.position ?? '—'} />
                <InfoItem label="Jersey" value={`#${roster.jersey_number ?? '—'}`} />
                <InfoItem label="Bats / Throws" value={`${roster.bats ?? '—'} / ${roster.throws ?? '—'}`} />
                <InfoItem
                  label="Born"
                  value={roster.birth_date
                    ? new Date(roster.birth_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : '—'}
                />
                <InfoItem label="Height / Weight" value={`${roster.height ?? '—'} · ${roster.weight ?? '—'}`} />
              </dl>
            </section>
          )}

          {/* ── 시즌 스탯 ── */}
          <section>
            {/* 시즌 전환 버튼 */}
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <SeasonBtn
                year={2025}
                active={viewSeason === 2025}
                disabled={!has2025Data}
                onClick={() => setViewSeason(2025)}
              />
              <SeasonBtn
                year={2026}
                active={viewSeason === 2026}
                disabled={!has2026Data}
                onClick={() => setViewSeason(2026)}
              />
            </div>

            {/* 2026 스탯 */}
            {viewSeason === 2026 && (
              <div className="space-y-5">
                {hitting2026Agg ? (
                  <StatBlock
                    title="Hitting"
                    subtitle={`${hitting2026Agg.games}G · ${hitting2026Agg.ab} AB`}
                    note={leagueHit2026
                      ? `vs 2026 league avg · ${leagueHit2026.qualifiedPlayers} qualified hitters (min 5 AB)`
                      : undefined}
                  >
                    <StatVsLeague label="AVG" player={hitting2026Agg.avg} league={leagueHit2026?.avg} higherIsBetter />
                    <StatVsLeague label="OBP" player={hitting2026Agg.obp} league={leagueHit2026?.obp} higherIsBetter />
                    <StatVsLeague label="HR" player={hitting2026Agg.hr} league={leagueHit2026?.home_runs} higherIsBetter decimals={1} />
                    <StatVsLeague label="RBI" player={hitting2026Agg.rbi} league={leagueHit2026?.rbi} higherIsBetter decimals={1} />
                    <StatVsLeague label="SB" player={hitting2026Agg.sb} league={leagueHit2026?.stolen_bases} higherIsBetter decimals={1} />
                    <StatVsLeague label="BB" player={hitting2026Agg.bb} league={leagueHit2026?.walks} higherIsBetter decimals={1} />
                  </StatBlock>
                ) : (
                  <p className="rounded-xl border border-dashed border-white/10 bg-[#0f1117]/80 px-4 py-3 text-sm text-slate-400">
                    No 2026 hitting data yet.
                  </p>
                )}

                {pitching2026Agg && (
                  <StatBlock
                    title="Pitching"
                    subtitle={`${pitching2026Agg.games}G · ${pitching2026Agg.ip} IP`}
                    note={leaguePit2026
                      ? `vs 2026 league avg · ${leaguePit2026.qualifiedPlayers} qualified pitchers (min 3 IP)`
                      : undefined}
                  >
                    <StatVsLeague label="ERA" player={pitching2026Agg.era} league={leaguePit2026?.era} higherIsBetter={false} />
                    <StatVsLeague label="K" player={pitching2026Agg.k} league={leaguePit2026?.strikeouts} higherIsBetter decimals={1} />
                    <StatVsLeague label="BB" player={pitching2026Agg.bb} league={leaguePit2026?.walks} higherIsBetter={false} decimals={1} />
                    <StatSimple label="IP" value={pitching2026Agg.ip.toFixed(1)} />
                    <StatSimple label="ER" value={pitching2026Agg.er} />
                  </StatBlock>
                )}
              </div>
            )}

            {/* 2025 스탯 */}
            {viewSeason === 2025 && (
              <div className="space-y-5">
                {hitting2025 ? (
                  <StatBlock
                    title="Hitting"
                    subtitle="2025 full season"
                    note={leagueHit2025 ? 'vs 2025 league avg (all qualified hitters)' : undefined}
                  >
                    <StatVsLeague label="AVG" player={hitting2025.avg} league={leagueHit2025?.avg} higherIsBetter />
                    <StatVsLeague label="OBP" player={hitting2025.obp} league={leagueHit2025?.obp} higherIsBetter />
                    <StatVsLeague label="SLG" player={hitting2025.slg} league={leagueHit2025?.slg} higherIsBetter />
                    <StatVsLeague label="OPS" player={hitting2025.ops} league={leagueHit2025?.ops} higherIsBetter showOpsIndex />
                    <StatSimple label="HR" value={hitting2025.home_runs ?? '—'} />
                    <StatSimple label="RBI" value={hitting2025.rbi ?? '—'} />
                  </StatBlock>
                ) : (
                  <p className="rounded-xl border border-dashed border-white/10 bg-[#0f1117]/80 px-4 py-3 text-sm text-slate-400">
                    No 2025 hitting data in the database.
                  </p>
                )}

                {pitching2025 && (
                  <StatBlock
                    title="Pitching"
                    subtitle="2025 full season"
                    note={leaguePit2025 ? 'vs 2025 league avg (all qualified pitchers)' : undefined}
                  >
                    <StatVsLeague label="ERA" player={pitching2025.era} league={leaguePit2025?.era} higherIsBetter={false} />
                    <StatVsLeague label="WHIP" player={pitching2025.whip} league={leaguePit2025?.whip} higherIsBetter={false} />
                    <StatSimple label="W" value={pitching2025.wins ?? '—'} />
                    <StatSimple label="L" value={pitching2025.losses ?? '—'} />
                    <StatSimple label="K" value={pitching2025.strikeouts ?? '—'} />
                    <StatSimple label="BB" value={pitching2025.bb ?? pitching2025.walks ?? '—'} />
                  </StatBlock>
                )}
              </div>
            )}
          </section>

          {/* ── 차트: 2025는 bar/radar, 2026은 game trends ── */}

          {/* 2025 차트 */}
          {viewSeason === 2025 && chartProfile && (
            <section className="space-y-6">
              <h3 className="font-heading text-base font-semibold text-white">
                2025 full season charts
              </h3>
              {chartProfile.hitting && (
                <HittingCharts2025 h={chartProfile.hitting} league={chartLeague?.hitting} />
              )}
              {chartProfile.pitching && (
                <PitchingCharts2025 p={chartProfile.pitching} league={chartLeague?.pitching} />
              )}
            </section>
          )}

          {/* 2026 game trends */}
          {viewSeason === 2026 && chartHitting.length > 0 && (
            <TrendSection
              title="2026 · Game trends (hitting)"
              subtitle={`Last ${chartHitting.length} games · bars = hits, red line = home runs`}
              chart={
                <ComposedChart data={chartHitting} margin={{ top: 8, right: 36, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#334155' }} />
                  <YAxis yAxisId="hits" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} width={24} allowDecimals={false} />
                  <YAxis yAxisId="hr" orientation="right" tick={{ fill: '#f87171', fontSize: 11 }} tickLine={false} axisLine={false} width={24} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '13px', padding: '10px 14px' }}
                    labelStyle={{ color: '#e2e8f0', marginBottom: 6, fontWeight: 600 }}
                    formatter={((v: unknown, name: string) => name === 'Hits' ? [`${v ?? 0} H`, 'Hits'] : [`${v ?? 0}`, 'Home Runs']) as never}
                  />
                  <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} formatter={(v) => <span style={{ color: '#cbd5e1' }}>{v}</span>} />
                  <Bar yAxisId="hits" dataKey="hits" name="Hits" fill="#facc15" radius={[4, 4, 0, 0]} opacity={0.85} maxBarSize={40} />
                  <Line yAxisId="hr" type="monotone" dataKey="hr" name="HR" stroke="#f87171" strokeWidth={2} dot={{ r: 5, fill: '#f87171', stroke: '#1e293b', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                </ComposedChart>
              }
              table={
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      {['Date', 'AB', 'H', 'HR', 'RBI', 'BB', 'AVG'].map((h, i) => (
                        <th key={h} className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide ${i === 0 ? 'text-left text-slate-500' : 'text-right'} ${h === 'H' ? 'text-[#facc15]/70' : h === 'HR' ? 'text-red-400/70' : 'text-slate-500'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hittingBox2026.slice(0, 10).map(g => (
                      <tr key={g.game_pk} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03]">
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
              }
            />
          )}

          {viewSeason === 2026 && chartPitching.length > 0 && (
            <TrendSection
              title="2026 · Game trends (pitching)"
              subtitle={`Last ${chartPitching.length} starts · bars = strikeouts, yellow line = IP`}
              chart={
                <ComposedChart data={chartPitching} margin={{ top: 8, right: 36, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" opacity={0.5} />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#334155' }} />
                  <YAxis yAxisId="k" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} width={24} allowDecimals={false} />
                  <YAxis yAxisId="ip" orientation="right" tick={{ fill: '#facc15', fontSize: 11 }} tickLine={false} axisLine={false} width={24} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', fontSize: '13px', padding: '10px 14px' }}
                    labelStyle={{ color: '#e2e8f0', marginBottom: 6, fontWeight: 600 }}
                    formatter={((v: unknown, name: string) => name === 'K' ? [`${v ?? 0}`, 'Strikeouts'] : [`${v ?? 0}`, 'Innings Pitched']) as never}
                  />
                  <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} formatter={(v) => <span style={{ color: '#cbd5e1' }}>{v}</span>} />
                  <Bar yAxisId="k" dataKey="k" name="K" fill="#818cf8" radius={[4, 4, 0, 0]} opacity={0.85} maxBarSize={40} />
                  <Line yAxisId="ip" type="monotone" dataKey="ip" name="IP" stroke="#facc15" strokeWidth={2} dot={{ r: 5, fill: '#facc15', stroke: '#1e293b', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                </ComposedChart>
              }
              table={
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      {[['Date', false, false], ['IP', true, true], ['K', true, false], ['ER', true, false], ['BB', true, false]].map(([h, right, accent]) => (
                        <th key={String(h)} className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide ${right ? 'text-right' : 'text-left'} ${accent ? 'text-[#facc15]/70' : h === 'K' ? 'text-indigo-400/70' : h === 'ER' ? 'text-red-400/70' : 'text-slate-500'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pitchingBox2026.slice(0, 10).map(g => (
                      <tr key={g.game_pk} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03]">
                        <td className="px-3 py-2.5 text-slate-300">{formatShortDate(g.game_date)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-bold text-[#facc15]">{g.innings_pitched != null ? Number(g.innings_pitched).toFixed(1) : '—'}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-bold text-indigo-400">{g.strikeouts ?? '—'}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-red-400">{g.earned_runs ?? '—'}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{g.walks ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            />
          )}

        </div>
      )}
    </MlbModal>
  )
}

// ─── Season toggle button ─────────────────────────────────────────────────────

function SeasonBtn({
  year, active, disabled, onClick,
}: {
  year: 2025 | 2026
  active: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
        active
          ? 'bg-[#facc15] text-[#0f1117] shadow-sm shadow-[#facc15]/20'
          : 'border border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
      }`}
    >
      {active && (
        <span className="h-1.5 w-1.5 rounded-full bg-[#0f1117]/60" />
      )}
      View {year} data
    </button>
  )
}

// ─── Stat block wrapper ───────────────────────────────────────────────────────

function StatBlock({
  title, subtitle, note, children,
}: {
  title: string
  subtitle?: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p className="text-sm font-semibold text-[#facc15]">{title}</p>
        {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
      </div>
      {note && <p className="mb-3 text-xs text-slate-500">{note}</p>}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/[0.1] bg-[#0f1117] p-5 sm:grid-cols-3">
        {children}
      </div>
    </div>
  )
}

// ─── Trend chart section ──────────────────────────────────────────────────────

function TrendSection({
  title, subtitle, chart, table,
}: {
  title: string
  subtitle: string
  chart: React.ReactNode
  table: React.ReactNode
}) {
  return (
    <section>
      <h3 className="font-heading text-base font-semibold text-white">{title}</h3>
      <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
      <div className="mt-4 h-60 w-full min-w-0 rounded-xl border border-white/[0.1] bg-[#0f1117] p-4">
        <ResponsiveContainer width="100%" height="100%">
          {chart as React.ReactElement}
        </ResponsiveContainer>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.1] bg-[#0f1117]">
        {table}
      </div>
    </section>
  )
}

// ─── Stat components ──────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-100">{value}</dd>
    </div>
  )
}

function StatSimple({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 font-heading text-2xl font-bold tabular-nums tracking-tight text-white">{value}</p>
    </div>
  )
}

// ─── 2025 차트 컴포넌트 ───────────────────────────────────────────────────────

const CHART_ACCENT = '#c9a84c'
const CHART_LEAGUE = '#22c55e'
const CHART_GRID = 'rgba(255,255,255,0.06)'
const CHART_AXIS = '#d1dae3'
const chartTooltipStyle = {
  contentStyle: {
    background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, fontSize: 12, color: '#e8edf4',
  },
  labelStyle: { color: '#f1f5f9' },
  itemStyle: { color: '#e8edf4' },
}
const chartLegendProps = {
  wrapperStyle: { fontSize: 11, paddingTop: 8 },
  formatter: (value: string) => <span className="text-white/88">{value}</span>,
}

function fmt3(v: unknown): string {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(3) : '—'
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)) }
function fallH(p: number, max: number) { return clamp(100 * Math.min(p / max, 1), 0, 100) }
function fallL(p: number, bad: number) { return clamp(100 * (1 - Math.min(p / bad, 1)), 0, 100) }

function ChartBlock2025({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.1] bg-[#0f1117] p-4">
      <h4 className="mb-1 font-heading text-xs font-bold uppercase tracking-wider text-white/90">{title}</h4>
      {hint ? <p className="mb-3 text-[10px] text-white/70">{hint}</p> : <div className="mb-3" />}
      {children}
    </div>
  )
}

function HittingCharts2025({
  h, league,
}: {
  h: NonNullable<PlayerChartProfile['hitting']>
  league: SeasonLeagueAverages['hitting'] | null | undefined
}) {
  const showLeague = league != null
  const rate = [
    { name: 'AVG', value: h.avg, league: league?.avg ?? null },
    { name: 'OBP', value: h.obp ?? h.avg, league: league?.obp ?? null },
    { name: 'SLG', value: h.slg ?? 0, league: league?.slg ?? null },
    { name: 'OPS', value: h.ops, league: league?.ops ?? null },
  ]
  const rateMax = Math.min(1.95, Math.max(1.05, Math.max(...rate.flatMap(r => [r.value, r.league ?? 0]), 0.35) * 1.12))
  const counting = [
    { name: 'HR', value: h.home_runs, league: league?.home_runs ?? null },
    { name: 'RBI', value: h.rbi, league: league?.rbi ?? null },
    ...(h.hits != null ? [{ name: 'H', value: Math.round(h.hits), league: league?.hits ?? null }] : []),
    ...(h.at_bats != null ? [{ name: 'AB', value: Math.round(h.at_bats), league: league?.at_bats ?? null }] : []),
  ]
  const countYMax = Math.max(Math.max(...counting.flatMap(c => [c.value, c.league ?? 0]), 1) * 1.12, 1)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChartBlock2025 title="Rate stats" hint={showLeague ? 'Green line = 2025 season average (qualified hitters)' : undefined}>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rate} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART_AXIS, fontSize: 11 }} axisLine={{ stroke: CHART_GRID }} />
              <YAxis domain={[0, rateMax]} tick={{ fill: CHART_AXIS, fontSize: 11 }} axisLine={{ stroke: CHART_GRID }} tickFormatter={v => fmt3(v)} />
              <Tooltip {...chartTooltipStyle} formatter={((v: unknown, name: string) => [fmt3(v), name]) as never} />
              <Legend {...chartLegendProps} />
              <Bar dataKey="value" name="Player" fill={CHART_ACCENT} radius={[4, 4, 0, 0]} maxBarSize={48} />
              {showLeague && <Line type="monotone" dataKey="league" name="Season avg" stroke={CHART_LEAGUE} strokeWidth={2.5} dot={{ r: 4, fill: CHART_LEAGUE, strokeWidth: 0 }} activeDot={{ r: 5 }} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock2025>
      <ChartBlock2025 title="Counting stats" hint={showLeague ? 'Green line = mean among qualified hitters' : undefined}>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={counting} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: CHART_AXIS, fontSize: 11 }} axisLine={{ stroke: CHART_GRID }} />
              <YAxis domain={[0, countYMax]} tick={{ fill: CHART_AXIS, fontSize: 11 }} axisLine={{ stroke: CHART_GRID }} tickFormatter={v => fmt3(v)} />
              <Tooltip {...chartTooltipStyle} formatter={((v: unknown, name: string) => [fmt3(v), name]) as never} />
              <Legend {...chartLegendProps} />
              <Bar dataKey="value" name="Player" fill={CHART_ACCENT} radius={[4, 4, 0, 0]} maxBarSize={48} />
              {showLeague && <Line type="monotone" dataKey="league" name="Season avg" stroke={CHART_LEAGUE} strokeWidth={2.5} dot={{ r: 4, fill: CHART_LEAGUE, strokeWidth: 0 }} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock2025>
    </div>
  )
}

type PRadarRow = { subject: string; player: number; leagueAvg: number; rawPlayer: number | null; rawLeague: number | null }
const RADAR_ORDER = ['ERA', 'W', 'WHIP', 'L', 'IP', 'K'] as const

function PitchingRadarTooltip2025({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: PRadarRow }> }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="rounded-lg border border-white/20 bg-[#1a1f2e] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-white">{row.subject}</p>
      <p className="text-white/88">Player: {row.rawPlayer == null ? '—' : fmt3(row.rawPlayer)}</p>
      {row.rawLeague != null && <p className="text-white/88">League avg: {fmt3(row.rawLeague)}</p>}
      <p className="mt-1 text-[10px] text-white/65">Index vs league: {fmt3(row.player)} (100 = avg)</p>
    </div>
  )
}

// fallback 스케일: league avg가 0이거나 없을 때 사용
const FALLBACK_HIGHER: Record<string, number> = { K: 300, IP: 200, W: 25 }
const FALLBACK_LOWER: Record<string, number> = { ERA: 6, WHIP: 2, L: 20 }

function PitchingCharts2025({
  p, league,
}: {
  p: NonNullable<PlayerChartProfile['pitching']>
  league: SeasonLeagueAverages['pitching'] | null | undefined
}) {
  const rows: PRadarRow[] = []

  const add = (subject: string, raw: number | null | undefined, rawL: number | null | undefined, higher: boolean) => {
    if (raw == null) return
    // rawL이 실제 유효한 양수일 때만 리그 인덱스 사용, 아니면 fallback
    const lgValid = rawL != null && rawL > 0
    let player: number
    if (lgValid) {
      player = higher
        ? clamp(100 * (raw / rawL!), 0, 200)
        : clamp(100 * (rawL! / Math.max(raw, 1e-9)), 0, 200)
    } else {
      player = higher
        ? fallH(raw, FALLBACK_HIGHER[subject] ?? 100)
        : fallL(raw, FALLBACK_LOWER[subject] ?? 6)
    }
    rows.push({ subject, player, leagueAvg: lgValid ? 100 : 0, rawPlayer: raw, rawLeague: rawL ?? null })
  }
  const hasLeague = league != null && Object.values(league).some(v => typeof v === 'number' && v > 0)
  add('ERA', p.era, league?.era, false)
  add('WHIP', p.whip, league?.whip, false)
  add('IP', p.innings_pitched, league?.innings_pitched, true)
  add('K', p.strikeouts, league?.strikeouts, true)
  add('W', p.wins, league?.wins, true)
  add('L', p.losses, league?.losses, false)
  const orderMap = new Map(RADAR_ORDER.map((s, i) => [s as string, i]))
  const sorted = [...rows].sort((a, b) => (orderMap.get(a.subject) ?? 99) - (orderMap.get(b.subject) ?? 99))

  if (sorted.length < 3) return (
    <p className="text-sm text-slate-400">Not enough pitching stats to draw a radar (need ≥ 3).</p>
  )

  const maxVal = Math.max(...sorted.map(r => r.player), 100)
  const domainMin = 0
  const domainMax = Math.min(200, Math.ceil(maxVal / 20) * 20 + 20)

  return (
    <ChartBlock2025
      title="Pitching profile (radar)"
      hint={hasLeague ? 'Each axis indexed vs 2025 league avg · 100 = league average · ERA/WHIP/L: outward = better · IP/K/W: outward = better' : 'League avg unavailable — rough scale only.'}
    >
      <div className="h-80 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="52%" outerRadius="72%" data={sorted}>
            <PolarGrid stroke={CHART_GRID} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: CHART_AXIS, fontSize: 12, fontWeight: 600 }} />
            <PolarRadiusAxis
              angle={30}
              domain={[domainMin, domainMax]}
              tick={{ fill: CHART_AXIS, fontSize: 10 }}
              tickCount={4}
              tickFormatter={v => v === 100 ? 'avg' : String(Math.round(v))}
            />
            <Tooltip content={<PitchingRadarTooltip2025 />} />
            <Legend {...chartLegendProps} />
            <Radar name="Player (index)" dataKey="player" stroke={CHART_ACCENT} fill={CHART_ACCENT} fillOpacity={0.4} strokeWidth={2.5} dot={{ r: 4, fill: CHART_ACCENT }} />
            {hasLeague && <Radar name="League avg (100)" dataKey="leagueAvg" stroke={CHART_LEAGUE} fill={CHART_LEAGUE} fillOpacity={0.08} strokeWidth={2} strokeDasharray="5 3" dot={false} />}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </ChartBlock2025>
  )
}

function StatVsLeague({
  label, player, league, higherIsBetter, showOpsIndex, decimals = 3,
}: {
  label: string
  player: number | null | undefined
  league: number | null | undefined
  higherIsBetter: boolean
  showOpsIndex?: boolean
  decimals?: number
}) {
  const p = player != null && !Number.isNaN(player) ? Number(player) : null
  const lg = league != null && !Number.isNaN(league) ? Number(league) : null
  const showCmp = p != null && lg != null
  const diff = showCmp ? p - lg : null
  const good = diff == null ? null : higherIsBetter ? diff > 0 : diff < 0
  const fmt = (v: number) => v.toFixed(decimals)
  const opsIndex = showOpsIndex && showCmp && lg > 0 ? Math.round((p / lg) * 100) : null

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 font-heading text-2xl font-bold tabular-nums tracking-tight text-white">
        {p != null ? fmt(p) : '—'}
      </p>
      {showCmp && (
        <p className={`mt-1 text-xs tabular-nums ${good ? 'text-emerald-400' : diff === 0 ? 'text-slate-500' : 'text-rose-400'}`}>
          Lg {fmt(lg!)} · {diff! >= 0 ? '+' : ''}{fmt(diff!)}
        </p>
      )}
      {opsIndex != null && (
        <p className="mt-0.5 text-[11px] text-slate-500">OPS index {opsIndex} (100 = avg)</p>
      )}
    </div>
  )
}
