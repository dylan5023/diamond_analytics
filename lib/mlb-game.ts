import type { GameSnapshot } from '@/types'

/** DB/API may use English or Korean for completed games */
export function isFinalStatus(status: string | undefined | null): boolean {
  const s = status?.trim() ?? ''
  if (s === 'Final' || s === '\uC885\uB8CC') return true
  return false
}

export type FinalOutcome =
  | { kind: 'winner'; teamName: string; side: 'away' | 'home' }
  | { kind: 'tie' }

/**
 * From final scores, who won (for display). Does not check status — use with isFinalStatus when needed.
 */
export function getFinalOutcome(game: GameSnapshot): FinalOutcome {
  const a = game.away_score
  const h = game.home_score
  if (a > h) return { kind: 'winner', teamName: game.away_team, side: 'away' }
  if (h > a) return { kind: 'winner', teamName: game.home_team, side: 'home' }
  return { kind: 'tie' }
}
