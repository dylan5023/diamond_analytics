/** Calendar bucket for top-news keys and UI labels (IANA). */
export const TOP_NEWS_CALENDAR_TZ = 'America/Vancouver'

/** YYYY-MM-DD for `instant` in the given IANA timezone. */
export function calendarDateInTimeZone(timeZone: string, instant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

export function topNewsCalendarDate(instant?: Date): string {
  return calendarDateInTimeZone(TOP_NEWS_CALENDAR_TZ, instant ?? new Date())
}

/** Previous calendar date in `timeZone` relative to `reference` (handles DST). */
export function previousCalendarDateInTimeZone(
  timeZone: string,
  reference: Date = new Date(),
): string {
  const refYmd = calendarDateInTimeZone(timeZone, reference)
  let t = reference.getTime()
  for (let i = 0; i < 48; i++) {
    t -= 3600000
    const ymd = calendarDateInTimeZone(timeZone, new Date(t))
    if (ymd !== refYmd) return ymd
  }
  return refYmd
}
