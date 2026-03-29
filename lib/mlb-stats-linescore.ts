import type { GameSnapshot } from '@/types'
import type { GameLinescoreInning, GameLinescoreRow } from '@/types/mlb'

type MlbLinescoreJson = {
  currentInning?: number | null
  inningState?: string | null
  inningHalf?: string | null
  isTopInning?: boolean | null
  innings?: {
    num?: number
    away?: { runs?: number | null }
    home?: { runs?: number | null }
  }[]
  teams?: {
    away?: { runs?: number | null; hits?: number | null; errors?: number | null }
    home?: { runs?: number | null; hits?: number | null; errors?: number | null }
  }
}

function halfIsTopFromMlbState(state: string | undefined | null): boolean | null {
  const s = state?.trim() ?? ''
  if (s === 'Top') return true
  if (s === 'Bottom') return false
  return null
}

export function extractLiveLinescoreHighlight(json: MlbLinescoreJson): Pick<
  GameLinescoreRow,
  'live_current_inning' | 'live_is_top_half'
> | null {
  const ci = json.currentInning
  if (typeof ci !== 'number' || !Number.isFinite(ci) || ci < 1) return null
  let isTop: boolean | null = null
  if (typeof json.isTopInning === 'boolean') isTop = json.isTopInning
  else isTop = halfIsTopFromMlbState(json.inningState ?? json.inningHalf)
  return { live_current_inning: ci, live_is_top_half: isTop }
}

/**
 * Live games only: when `game_linescores` has no row yet, pull inning R/H/E from MLB Stats API.
 * Final games should use DB pipeline rows only — do not call this for completed games.
 */
export async function fetchLiveLinescoreFromMlb(game: GameSnapshot): Promise<GameLinescoreRow | null> {
  try {
    const res = await fetch(`https://statsapi.mlb.com/api/v1/game/${game.game_pk}/linescore`)
    if (!res.ok) return null
    const json = (await res.json()) as MlbLinescoreJson
    const raw = json.innings ?? []
    const innings: GameLinescoreInning[] = raw
      .filter(inn => inn.num != null && Number.isFinite(Number(inn.num)))
      .map(inn => ({
        num: inn.num ?? null,
        away: inn.away?.runs ?? null,
        home: inn.home?.runs ?? null,
      }))
    const away = json.teams?.away
    const home = json.teams?.home
    const highlight = extractLiveLinescoreHighlight(json)
    return {
      game_pk: game.game_pk,
      game_date: game.game_date ?? null,
      home_team: game.home_team,
      away_team: game.away_team,
      innings: innings.length ? innings : null,
      home_runs: home?.runs ?? null,
      away_runs: away?.runs ?? null,
      home_hits: home?.hits ?? null,
      away_hits: away?.hits ?? null,
      home_errors: home?.errors ?? null,
      away_errors: away?.errors ?? null,
      winner_name: null,
      loser_name: null,
      save_name: null,
      ...(highlight ?? {}),
    }
  } catch {
    return null
  }
}

/** Same endpoint, only the fields needed to highlight the active inning (for DB-backed live linescores). */
export async function fetchLiveLinescoreHighlightFromMlb(
  gamePk: number
): Promise<Pick<GameLinescoreRow, 'live_current_inning' | 'live_is_top_half'> | null> {
  try {
    const res = await fetch(`https://statsapi.mlb.com/api/v1/game/${gamePk}/linescore`)
    if (!res.ok) return null
    const json = (await res.json()) as MlbLinescoreJson
    return extractLiveLinescoreHighlight(json)
  } catch {
    return null
  }
}
