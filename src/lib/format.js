// Formatter construction is expensive, so they're created once at module load
// rather than per call.
const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' })
const DATETIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

/**
 * Money.
 *
 * Every money column in the schema is DECIMAL(10,2) and there is no currency
 * column anywhere — the system prices in rupees and only rupees. Rendering an
 * amount is therefore a display concern with exactly one right answer, so it
 * lives here rather than in a feature: the same package price has to read
 * identically on the product page, in the quotation that consumes it, and on
 * the printed document the customer receives.
 *
 * `Intl` supplies the digit grouping only. Asking it for `style: 'currency'`
 * with `LKR` yields "LKR 60,000.00", while the printed template says
 * "Rs. 60,000.00"; prepending the symbol keeps screen and paper identical.
 */
const RUPEES_FORMATTER = new Intl.NumberFormat('en-LK', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const RUPEES_WHOLE_FORMATTER = new Intl.NumberFormat('en-LK', {
  maximumFractionDigits: 0,
})

/**
 * "Rs. 60,000.00"
 *
 * @param {number|string|null|undefined} amount Non-numeric input renders as
 *   zero rather than "Rs. NaN" — a blank price field mid-edit is not an error.
 * @param {object} [options]
 * @param {boolean} [options.whole] Drop the cents. For rolled-up figures such
 *   as a dashboard total, where the decimals are noise — never for a price
 *   someone is quoted, invoiced or charged.
 * @returns {string}
 */
export function formatRupees(amount, { whole = false } = {}) {
  const value = Number(amount)
  const formatter = whole ? RUPEES_WHOLE_FORMATTER : RUPEES_FORMATTER
  return `Rs. ${formatter.format(Number.isFinite(value) ? value : 0)}`
}

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
