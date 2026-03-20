import type { SupabaseClient } from '@supabase/supabase-js'

/** Partial row for aggregation only */
export type HittingAggRow = {
  at_bats?: number | null
  hits?: number | null
  walks?: number | null
  slg?: number | null
}

export type PitchingAggRow = {
  innings_pitched?: number | null
  era?: number | null
  whip?: number | null
}

export type LeagueHittingAverages = {
  avg: number | null
  obp: number | null
  slg: number | null
  ops: number | null
  /** Row count used in aggregation */
  playerRows: number
}

export type LeaguePitchingAverages = {
  era: number | null
  whip: number | null
  playerRows: number
}

/**
 * League hitting line from summed counting stats + SLG weighted by AB.
 * OBP uses (H+BB)/(AB+BB) — close to MLB OBP when HBP/SF are omitted (same DB for all).
 */
export function computeLeagueHitting(rows: HittingAggRow[]): LeagueHittingAverages {
  let ab = 0
  let h = 0
  let bb = 0
  let slgWeighted = 0

  for (const r of rows) {
    const ab_i = r.at_bats ?? 0
    const h_i = r.hits ?? 0
    const bb_i = r.walks ?? 0
    const slg = r.slg
    ab += ab_i
    h += h_i
    bb += bb_i
    if (ab_i > 0 && slg != null && !Number.isNaN(slg)) {
      slgWeighted += slg * ab_i
    }
  }

  const avg = ab > 0 ? h / ab : null
  const slg = ab > 0 ? slgWeighted / ab : null
  const obp = ab + bb > 0 ? (h + bb) / (ab + bb) : null
  const ops = obp != null && slg != null ? obp + slg : null

  return {
    avg,
    obp,
    slg,
    ops,
    playerRows: rows.length,
  }
}

/**
 * ERA / WHIP weighted by IP — matches how combined league rates are derived from player lines.
 */
export function computeLeaguePitching(rows: PitchingAggRow[]): LeaguePitchingAverages {
  let ip = 0
  let eraW = 0
  let whipW = 0
  let eraCount = 0
  let whipCount = 0

  for (const r of rows) {
    const ip_i = typeof r.innings_pitched === 'number' ? r.innings_pitched : Number(r.innings_pitched) || 0
    if (ip_i <= 0) continue
    ip += ip_i
    const era = r.era
    const whip = r.whip
    if (era != null && !Number.isNaN(era)) {
      eraW += era * ip_i
      eraCount += ip_i
    }
    if (whip != null && !Number.isNaN(whip)) {
      whipW += whip * ip_i
      whipCount += ip_i
    }
  }

  return {
    era: eraCount > 0 ? eraW / eraCount : null,
    whip: whipCount > 0 ? whipW / whipCount : null,
    playerRows: rows.length,
  }
}

const PAGE = 1000
const CACHE_TTL_MS = 10 * 60 * 1000

type CacheEntry<T> = { value: T; at: number }

let cacheHitting: CacheEntry<LeagueHittingAverages> | null = null
let cachePitching: CacheEntry<LeaguePitchingAverages> | null = null

async function fetchAllHittingRows(
  supabase: SupabaseClient,
  season: number
): Promise<HittingAggRow[]> {
  const out: HittingAggRow[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('player_stats')
      .select('at_bats, hits, walks, slg')
      .eq('season', season)
      .eq('stat_group', 'hitting')
      .range(from, from + PAGE - 1)

    if (error) throw error
    const chunk = (data ?? []) as HittingAggRow[]
    out.push(...chunk)
    if (chunk.length < PAGE) break
    from += PAGE
  }
  return out
}

async function fetchAllPitchingRows(
  supabase: SupabaseClient,
  season: number
): Promise<PitchingAggRow[]> {
  const out: PitchingAggRow[] = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('player_stats')
      .select('innings_pitched, era, whip')
      .eq('season', season)
      .eq('stat_group', 'pitching')
      .range(from, from + PAGE - 1)

    if (error) throw error
    const chunk = (data ?? []) as PitchingAggRow[]
    out.push(...chunk)
    if (chunk.length < PAGE) break
    from += PAGE
  }
  return out
}

export async function getLeagueHittingAverages(
  supabase: SupabaseClient,
  season: number
): Promise<LeagueHittingAverages> {
  if (cacheHitting && Date.now() - cacheHitting.at < CACHE_TTL_MS) {
    return cacheHitting.value
  }
  const rows = await fetchAllHittingRows(supabase, season)
  const value = computeLeagueHitting(rows)
  cacheHitting = { value, at: Date.now() }
  return value
}

export async function getLeaguePitchingAverages(
  supabase: SupabaseClient,
  season: number
): Promise<LeaguePitchingAverages> {
  if (cachePitching && Date.now() - cachePitching.at < CACHE_TTL_MS) {
    return cachePitching.value
  }
  const rows = await fetchAllPitchingRows(supabase, season)
  const value = computeLeaguePitching(rows)
  cachePitching = { value, at: Date.now() }
  return value
}
