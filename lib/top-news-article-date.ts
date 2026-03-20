import { TOP_NEWS_CALENDAR_TZ, calendarDateInTimeZone } from '@/lib/top-news-calendar'

/**
 * KV bucket key (YYYY-MM-DD in Vancouver) from `article.date`.
 * Falls back to `sourceKeyDate` (the key the row was loaded from) when parsing fails.
 */
export function articleToVancouverBucket(
  article: Record<string, unknown>,
  sourceKeyDate: string,
): string {
  const raw = article.date
  if (typeof raw !== 'string' || !raw.trim()) return sourceKeyDate

  const s = raw.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // Instant with explicit offset / Z → Vancouver calendar day
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const ms = Date.parse(s)
    if (!Number.isNaN(ms)) {
      return calendarDateInTimeZone(TOP_NEWS_CALENDAR_TZ, new Date(ms))
    }
  }

  // "YYYY-MM-DD HH:mm" or "YYYY-MM-DDTHH:mm" without zone — trust the date part (avoids UTC server skew)
  const dm = s.match(/^(\d{4}-\d{2}-\d{2})[ T]/)
  if (dm) return dm[1]!

  const normalized = s.includes('T') ? s : s.replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T')
  const ms = Date.parse(normalized)
  if (!Number.isNaN(ms)) {
    return calendarDateInTimeZone(TOP_NEWS_CALENDAR_TZ, new Date(ms))
  }

  return sourceKeyDate
}
