'use client'

type Props = {
  awayProb: number
  homeProb: number
}

/**
 * Stacked bar: flex-grow = probability so widths stay accurate (no minWidth distortion).
 * Higher side is always gold; the other slate. Percentages always shown (in-bar + row below for tiny slices).
 */
export default function WinProbabilityBar({ awayProb, homeProb }: Props) {
  const awayPct = Math.round(awayProb * 100)
  const homePct = Math.round(homeProb * 100)
  const awayYellow = awayProb >= homeProb
  const homeYellow = homeProb >= awayProb

  const awayBg = awayYellow ? '#facc15' : 'rgba(148, 163, 184, 0.4)'
  const homeBg = homeYellow ? '#facc15' : 'rgba(148, 163, 184, 0.4)'
  const awayFg = awayYellow ? '#0f1117' : '#ffffff'
  const homeFg = homeYellow ? '#0f1117' : '#ffffff'

  return (
    <div className="min-w-0">
      <div className="flex h-11 w-full overflow-hidden rounded-lg sm:h-12">
        <div
          className="flex min-w-0 items-center justify-center px-1"
          style={{ flexGrow: awayProb, flexBasis: 0, backgroundColor: awayBg }}
        >
          <span
            className="whitespace-nowrap text-center text-xs font-semibold tabular-nums leading-none sm:text-sm"
            style={{ color: awayFg }}
          >
            {awayPct}%
          </span>
        </div>
        <div
          className="flex min-w-0 items-center justify-center px-1"
          style={{ flexGrow: homeProb, flexBasis: 0, backgroundColor: homeBg }}
        >
          <span
            className="whitespace-nowrap text-center text-xs font-semibold tabular-nums leading-none sm:text-sm"
            style={{ color: homeFg }}
          >
            {homePct}%
          </span>
        </div>
      </div>
    </div>
  )
}
