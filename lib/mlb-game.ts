import type { GameSnapshot } from '@/types'

/** Display game status in English (handles mixed DB values). Korean keys use \\u escapes (ASCII-only source). */
export function gameStatusEn(status: string | undefined | null): string {
  const s = status?.trim() ?? ''
  const map: Record<string, string> = {
    Live: 'Live',
    Scheduled: 'Scheduled',
    Final: 'Final',
    Cancelled: 'Cancelled',
    Canceled: 'Canceled',
    Postponed: 'Postponed',
    InProgress: 'Live',
    'In Progress': 'Live',
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
