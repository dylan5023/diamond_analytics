'use client'

import { useEffect, useState, useMemo } from 'react'
import { getFinalOutcome, isFinalStatus } from '@/lib/mlb-game'
import { supabase } from '@/lib/supabase'
import type { GameSnapshot } from '@/types'
import type { TeamRosterRow, GameBoxscoreRow } from '@/types/mlb'
import MlbModal from './MlbModal'

interface Props {
  game: GameSnapshot
  onClose: () => void
  onPlayerClick: (playerId: number) => void
}

function rosterKey(r: TeamRosterRow) {
  return `${r.player_id}-${r.team_id}`
}

/** Display game status in English (handles mixed DB values). Korean keys use \\u escapes (ASCII-only source). */
function gameStatusEn(status: string): string {
  const s = status?.trim() ?? ''
  const map: Record<string, string> = {
    Live: 'Live',
    Scheduled: 'Scheduled',
    Final: 'Final',
    Cancelled: 'Cancelled',
    Canceled: 'Canceled',
    Postponed: 'Postponed',
    InProgress: 'Live',
    Pregame: 'Scheduled',
    PreGame: 'Scheduled',
    Warmup: 'Scheduled',
    Preview: 'Scheduled',
    // Korean API values (\u escapes)
    '\uC9C4\uD589': 'Live',
    '\uC9C4\uD589\uC911': 'Live',
    '\uC9C4\uD589 \uC911': 'Live',
    '\uC608\uC815': 'Scheduled',
    '\uC885\uB8CC': 'Final',
    '\uCDE8\uC18C': 'Cancelled',
    '\uC5F0\uAE30': 'Postponed',
  }
  return map[s] ?? s
}

export default function GameDetailModal({ game, onClose, onPlayerClick }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rosters, setRosters] = useState<TeamRosterRow[]>([])
  const [boxscores, setBoxscores] = useState<GameBoxscoreRow[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [boxRes, rosterRes] = await Promise.all([
          supabase.from('game_boxscores').select('*').eq('game_pk', game.game_pk),
          (() => {
            const homeId = game.home_team_id
            const awayId = game.away_team_id
            if (homeId != null && awayId != null) {
              return supabase.from('team_rosters').select('*').in('team_id', [homeId, awayId])
            }
            return supabase.from('team_rosters').select('*').in('team_abbr', [game.away_team, game.home_team])
          })(),
        ])

        if (boxRes.error) throw boxRes.error
        if (rosterRes.error) throw rosterRes.error
        if (cancelled) return
        setBoxscores((boxRes.data ?? []) as GameBoxscoreRow[])
        setRosters((rosterRes.data ?? []) as TeamRosterRow[])
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
  }, [game])

  const nameByPlayerId = useMemo(() => {
    const m = new Map<number, string>()
    for (const r of rosters) {
      m.set(r.player_id, r.full_name)
    }
    return m
  }, [rosters])

  const posByPlayerId = useMemo(() => {
    const m = new Map<number, string>()
    for (const r of rosters) {
      if (r.position) m.set(r.player_id, r.position)
    }
    return m
  }, [rosters])

  const awayRoster = useMemo(() => {
    const list = rosters.filter(r => r.team_abbr === game.away_team || r.team_id === game.away_team_id)
    return list.sort((a, b) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999))
  }, [rosters, game.away_team, game.away_team_id])

  const homeRoster = useMemo(() => {
    const list = rosters.filter(r => r.team_abbr === game.home_team || r.team_id === game.home_team_id)
    return list.sort((a, b) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999))
  }, [rosters, game.home_team, game.home_team_id])

  const awayBox = useMemo(() => {
    return boxscores.filter(b => {
      if (game.away_team_id != null) return b.team_id === game.away_team_id
      const r = rosters.find(x => x.player_id === b.player_id)
      return r?.team_abbr === game.away_team
    })
  }, [boxscores, rosters, game.away_team, game.away_team_id])

  const homeBox = useMemo(() => {
    return boxscores.filter(b => {
      if (game.home_team_id != null) return b.team_id === game.home_team_id
      const r = rosters.find(x => x.player_id === b.player_id)
      return r?.team_abbr === game.home_team
    })
  }, [boxscores, rosters, game.home_team, game.home_team_id])

  const awayHitters = awayBox.filter(
    b => b.stat_group === 'hitting' && (b.at_bats ?? 0) !== 0
  )
  const awayPitchers = awayBox.filter(b => b.stat_group === 'pitching')
  const homeHitters = homeBox.filter(
    b => b.stat_group === 'hitting' && (b.at_bats ?? 0) !== 0
  )
  const homePitchers = homeBox.filter(b => b.stat_group === 'pitching')

  const title = `${game.away_team} @ ${game.home_team}`
  const finalOutcome = isFinalStatus(game.status) ? getFinalOutcome(game) : null
  const awayWon = finalOutcome?.kind === 'winner' && finalOutcome.side === 'away'
  const homeWon = finalOutcome?.kind === 'winner' && finalOutcome.side === 'home'

  return (
    <MlbModal title={title} onClose={onClose} wide>
      {loading && (
        <div className="space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-white/10" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-40 animate-pulse rounded-lg bg-white/10" />
            <div className="h-40 animate-pulse rounded-lg bg-white/10" />
          </div>
          <div className="h-32 animate-pulse rounded-lg bg-white/10" />
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && !error && (
        <div className="space-y-10">
          <div className="rounded-2xl border border-white/[0.1] bg-[#0f1117] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3 text-center sm:max-w-2xl">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Away</p>
                  <p
                    className={`mt-1 font-heading text-lg font-bold sm:text-xl ${awayWon ? 'text-[#facc15]' : 'text-white'}`}
                  >
                    {game.away_team}
                    {awayWon && (
                      <span className="ml-2 text-sm font-semibold text-[#facc15]/90">W</span>
                    )}
                  </p>
                  <p
                    className={`mt-2 font-heading text-4xl font-extrabold tabular-nums sm:text-5xl ${awayWon ? 'text-[#facc15]' : 'text-white'}`}
                  >
                    {game.away_score}
                  </p>
                </div>
                <span className="text-sm font-medium text-slate-500">@</span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Home</p>
                  <p
                    className={`mt-1 font-heading text-lg font-bold sm:text-xl ${homeWon ? 'text-[#facc15]' : 'text-white'}`}
                  >
                    {game.home_team}
                    {homeWon && (
                      <span className="ml-2 text-sm font-semibold text-[#facc15]/90">W</span>
                    )}
                  </p>
                  <p
                    className={`mt-2 font-heading text-4xl font-extrabold tabular-nums sm:text-5xl ${homeWon ? 'text-[#facc15]' : 'text-white'}`}
                  >
                    {game.home_score}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 sm:items-end">
                <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200">
                  {gameStatusEn(game.status)}
                </span>
                {finalOutcome?.kind === 'winner' && (
                  <span className="rounded-full bg-[#facc15]/15 px-3 py-1.5 text-xs font-semibold text-[#facc15]">
                    {finalOutcome.teamName} wins
                  </span>
                )}
                {finalOutcome?.kind === 'tie' && (
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400">
                    Tied game
                  </span>
                )}
              </div>
            </div>
          </div>

          <section>
            <h3 className="mb-1 font-heading text-lg font-semibold text-white">Lineups</h3>
            <p className="mb-5 text-sm text-slate-400">Tap a player to open their profile and stats.</p>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.1] bg-[#0f1117] p-4 sm:p-5">
                <p className="mb-4 border-b border-white/[0.08] pb-3 font-heading text-base font-semibold text-[#facc15]">
                  {game.away_team}
                </p>
                <ul className="space-y-0 divide-y divide-white/[0.06]">
                  {awayRoster.length === 0 && (
                    <li className="py-3 text-sm text-slate-500">No roster data</li>
                  )}
                  {awayRoster.map(r => (
                    <li key={rosterKey(r)} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                      <button
                        type="button"
                        onClick={() => onPlayerClick(r.player_id)}
                        className="min-w-0 flex-1 text-left text-base font-medium text-slate-100 transition-colors hover:text-[#facc15]"
                      >
                        {r.full_name}
                      </button>
                      <span className="shrink-0 text-sm tabular-nums text-slate-400">
                        {r.position ?? '—'} · #{r.jersey_number ?? '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/[0.1] bg-[#0f1117] p-4 sm:p-5">
                <p className="mb-4 border-b border-white/[0.08] pb-3 font-heading text-base font-semibold text-[#facc15]">
                  {game.home_team}
                </p>
                <ul className="space-y-0 divide-y divide-white/[0.06]">
                  {homeRoster.length === 0 && (
                    <li className="py-3 text-sm text-slate-500">No roster data</li>
                  )}
                  {homeRoster.map(r => (
                    <li key={rosterKey(r)} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                      <button
                        type="button"
                        onClick={() => onPlayerClick(r.player_id)}
                        className="min-w-0 flex-1 text-left text-base font-medium text-slate-100 transition-colors hover:text-[#facc15]"
                      >
                        {r.full_name}
                      </button>
                      <span className="shrink-0 text-sm tabular-nums text-slate-400">
                        {r.position ?? '—'} · #{r.jersey_number ?? '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <BoxTable
            label={`${game.away_team} — Batters`}
            rows={awayHitters}
            type="hitting"
            nameByPlayerId={nameByPlayerId}
            posByPlayerId={posByPlayerId}
            onPlayerClick={onPlayerClick}
          />
          <BoxTable
            label={`${game.away_team} — Pitchers`}
            rows={awayPitchers}
            type="pitching"
            nameByPlayerId={nameByPlayerId}
            posByPlayerId={posByPlayerId}
            onPlayerClick={onPlayerClick}
          />
          <BoxTable
            label={`${game.home_team} — Batters`}
            rows={homeHitters}
            type="hitting"
            nameByPlayerId={nameByPlayerId}
            posByPlayerId={posByPlayerId}
            onPlayerClick={onPlayerClick}
          />
          <BoxTable
            label={`${game.home_team} — Pitchers`}
            rows={homePitchers}
            type="pitching"
            nameByPlayerId={nameByPlayerId}
            posByPlayerId={posByPlayerId}
            onPlayerClick={onPlayerClick}
          />
        </div>
      )}
    </MlbModal>
  )
}

function BoxTable({
  label,
  rows,
  type,
  nameByPlayerId,
  posByPlayerId,
  onPlayerClick,
}: {
  label: string
  rows: GameBoxscoreRow[]
  type: 'hitting' | 'pitching'
  nameByPlayerId: Map<number, string>
  posByPlayerId: Map<number, string>
  onPlayerClick: (id: number) => void
}) {
  if (rows.length === 0) {
    return (
      <section>
        <h3 className="mb-1 font-heading text-base font-semibold text-white">{label}</h3>
        <p className="text-sm text-slate-500">No stats for this game yet.</p>
      </section>
    )
  }

  if (type === 'hitting') {
    const showAvgCol = rows.some(r => r.avg != null)
    return (
      <section>
        <h3 className="mb-3 font-heading text-base font-semibold text-white">{label}</h3>
        <div className="overflow-x-auto rounded-xl border border-white/[0.1] bg-[#0f1117]">
          <table className="w-full min-w-[640px] text-left text-sm text-slate-200">
            <thead className="bg-[#252b3d] text-xs font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="whitespace-nowrap px-3 py-3 text-left">Player</th>
                <th className="whitespace-nowrap px-3 py-3">Pos</th>
                <th className="whitespace-nowrap px-3 py-3 text-right">AB</th>
                {showAvgCol && (
                  <th className="whitespace-nowrap px-3 py-3 text-right">AVG</th>
                )}
                <th className="whitespace-nowrap px-3 py-3 text-right">H</th>
                <th className="whitespace-nowrap px-3 py-3 text-right">HR</th>
                <th className="whitespace-nowrap px-3 py-3 text-right">RBI</th>
                <th className="whitespace-nowrap px-3 py-3 text-right">K</th>
                <th className="whitespace-nowrap px-3 py-3 text-right">BB</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={`${row.player_id}-h`}
                  className={`transition-colors hover:bg-white/[0.06] ${i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'}`}
                >
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => onPlayerClick(row.player_id)}
                      className="text-left font-medium text-slate-100 hover:text-[#facc15]"
                    >
                      {nameByPlayerId.get(row.player_id) ?? `Player ${row.player_id}`}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">{posByPlayerId.get(row.player_id) ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{row.at_bats ?? '—'}</td>
                  {showAvgCol && (
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">
                      {row.avg != null ? fmtAvg(row.avg) : '—'}
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.hits ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.home_runs ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.rbi ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.strikeouts ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.walks ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  return (
    <section>
      <h3 className="mb-3 font-heading text-base font-semibold text-white">{label}</h3>
      <div className="overflow-x-auto rounded-xl border border-white/[0.1] bg-[#0f1117]">
        <table className="w-full min-w-[480px] text-left text-sm text-slate-200">
          <thead className="bg-[#252b3d] text-xs font-semibold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="whitespace-nowrap px-3 py-3 text-left">Player</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">IP</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">ER</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">K</th>
              <th className="whitespace-nowrap px-3 py-3 text-right">BB</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.player_id}-p`}
                className={`transition-colors hover:bg-white/[0.06] ${i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'}`}
              >
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onPlayerClick(row.player_id)}
                    className="text-left font-medium text-slate-100 hover:text-[#facc15]"
                  >
                    {nameByPlayerId.get(row.player_id) ?? `Player ${row.player_id}`}
                  </button>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.innings_pitched ?? '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.earned_runs ?? '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.strikeouts ?? '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.walks ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function fmtAvg(n: number) {
  if (Number.isNaN(n)) return ''
  return n.toFixed(3)
}
