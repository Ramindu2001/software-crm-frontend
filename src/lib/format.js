// Formatter construction is expensive, so they're created once at module load
// rather than per call.
const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' })
const DATETIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

// Each entry divides the running duration down into the next unit.
const DIVISIONS = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
]

/**
 * "3 hours ago", "yesterday", "last month".
 *
 * @param {string|number|Date} value
 * @param {number} [now] Injectable for deterministic tests.
 * @returns {string}
 */
export function formatRelativeTime(value, now = Date.now()) {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return ''

  let duration = (timestamp - now) / 1000

  for (const { amount, unit } of DIVISIONS) {
    if (Math.abs(duration) < amount) {
      return RELATIVE_FORMATTER.format(Math.round(duration), unit)
    }
    duration /= amount
  }

  return ''
}

/**
 * "12 Aug 2026"
 * @param {string|number|Date} value
 */
export function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : DATE_FORMATTER.format(date)
}

/**
 * "12 Aug 2026, 14:30"
 * @param {string|number|Date} value
 */
export function formatDateTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : DATETIME_FORMATTER.format(date)
}
