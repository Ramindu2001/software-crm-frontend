/**
 * Lead domain vocabulary.
 *
 * Keys are the API's values verbatim — `leads.status` is
 * enum('New','Contacted','Requirement Gathering','Qualified','Proposal Sent',
 * 'Won','Lost') — so a filter value goes straight onto the query string and a
 * response value looks itself up with no translation table in between.
 *
 * Two axes, deliberately separate:
 *   LEAD_STATUS        where the lead is in the pipeline
 *   LEAD_SOLUTION_TYPE what we intend to sell them
 * A Qualified lead can be heading for an off-the-shelf product or for custom
 * development, and collapsing the two would double the stage list.
 */

export const LEAD_STATUS = {
  New: {
    value: 'New',
    label: 'New',
    tone: 'info',
    rank: 0,
    hint: 'Contact details received, nobody has called yet.',
  },
  Contacted: {
    value: 'Contacted',
    label: 'Contacted',
    tone: 'info',
    rank: 1,
    hint: 'We have reached them at least once.',
  },
  'Requirement Gathering': {
    value: 'Requirement Gathering',
    label: 'Gathering requirements',
    tone: 'warning',
    rank: 2,
    hint: 'Working out what they actually need.',
  },
  Qualified: {
    value: 'Qualified',
    label: 'Qualified',
    tone: 'brand',
    rank: 3,
    hint: 'Requirements captured; we know what to offer.',
  },
  'Proposal Sent': {
    value: 'Proposal Sent',
    label: 'Proposal sent',
    tone: 'brand',
    rank: 4,
    hint: 'A product or a custom build has been offered.',
  },
  Won: {
    value: 'Won',
    label: 'Won',
    tone: 'success',
    rank: 5,
    hint: 'Closed and converted to a customer.',
  },
  Lost: {
    value: 'Lost',
    label: 'Lost',
    tone: 'danger',
    rank: 6,
    hint: 'Closed unsuccessfully, with a recorded reason.',
  },
}

/** Terminal stages. Both stamp `closed_at` server-side. */
export const CLOSED_STATUSES = ['Won', 'Lost']

export const isOpen = (lead) => !CLOSED_STATUSES.includes(lead?.status)

/**
 * Stages a user may pick in the status dropdown.
 *
 * Won and Lost are excluded on purpose. Won is reachable only through
 * conversion (which writes the customer record) and Lost needs a reason, so
 * both have their own dedicated action rather than being one option in a list
 * that would 409 or 422 the moment it was chosen.
 */
export const OPEN_STATUS_OPTIONS = Object.values(LEAD_STATUS)
  .filter((entry) => !CLOSED_STATUSES.includes(entry.value))
  .sort((a, b) => a.rank - b.rank)
  .map(({ value, label }) => ({ value, label }))

/**
 * The open stages in pipeline order.
 *
 * Drives both the board's columns and the detail page's stepper, so the two
 * can never present a different pipeline. Won and Lost are excluded for the
 * same reason they are excluded from the status dropdown: neither is reachable
 * by a plain stage move, and a board column that only ever accepts drops but
 * never shows a card is a column pulling its weight in neither direction.
 */
export const OPEN_STAGES = Object.values(LEAD_STATUS)
  .filter((entry) => !CLOSED_STATUSES.includes(entry.value))
  .sort((a, b) => a.rank - b.rank)

/** Position in the pipeline, or -1 for a stage we don't know. */
export const stageRank = (status) => LEAD_STATUS[status]?.rank ?? -1

/**
 * The stage after this one, or null at the end of the open pipeline.
 * Used for the stepper's "advance" affordance, which is the move a rep makes
 * far more often than any other.
 */
export function nextStage(status) {
  const index = OPEN_STAGES.findIndex((stage) => stage.value === status)
  if (index === -1 || index === OPEN_STAGES.length - 1) return null
  return OPEN_STAGES[index + 1]
}

export const LEAD_SOLUTION_TYPE = {
  Undecided: {
    value: 'Undecided',
    label: 'Not decided yet',
    tone: 'neutral',
    rank: 0,
  },
  'Existing Product': {
    value: 'Existing Product',
    label: 'Existing product',
    tone: 'info',
    rank: 1,
  },
  'Custom Development': {
    value: 'Custom Development',
    label: 'Custom development',
    tone: 'brand',
    rank: 2,
  },
}

export const LEAD_SOURCE = {
  Phone: { value: 'Phone', label: 'Phone', rank: 0 },
  Referral: { value: 'Referral', label: 'Referral', rank: 1 },
  Website: { value: 'Website', label: 'Website', rank: 2 },
  'Walk-in': { value: 'Walk-in', label: 'Walk-in', rank: 3 },
  'Social Media': { value: 'Social Media', label: 'Social media', rank: 4 },
  Email: { value: 'Email', label: 'Email', rank: 5 },
  Other: { value: 'Other', label: 'Other', rank: 6 },
}

/**
 * 'No Development Capacity' is its own reason rather than part of 'Other'.
 * Turning work away because nobody is free to build it is a hiring signal, and
 * it only becomes countable if it is a distinct option.
 */
export const LEAD_LOST_REASON = {
  'No Budget': { value: 'No Budget', label: 'No budget', rank: 0 },
  'No Requirement Fit': {
    value: 'No Requirement Fit',
    label: 'We could not meet the requirements',
    rank: 1,
  },
  'No Development Capacity': {
    value: 'No Development Capacity',
    label: 'No development capacity',
    rank: 2,
  },
  'Chose Competitor': { value: 'Chose Competitor', label: 'Chose a competitor', rank: 3 },
  'No Response': { value: 'No Response', label: 'Went quiet', rank: 4 },
  Other: { value: 'Other', label: 'Other', rank: 5 },
}

export const LEAD_ACTIVITY_TYPE = {
  Call: { value: 'Call', label: 'Call', rank: 0 },
  Email: { value: 'Email', label: 'Email', rank: 1 },
  Meeting: { value: 'Meeting', label: 'Meeting', rank: 2 },
  WhatsApp: { value: 'WhatsApp', label: 'WhatsApp', rank: 3 },
  Note: { value: 'Note', label: 'Note', rank: 4 },
}

/**
 * Requirement assessment — the routing decision, one line at a time.
 *
 *   Open    not assessed yet
 *   Covered an existing product does this
 *   Gap     nothing in the catalogue does this
 *
 * A lead with no Gaps is an off-the-shelf sale. A lead with Gaps is a
 * custom-development candidate, and those Gap rows are the scope to quote.
 */
export const REQUIREMENT_STATUS = {
  Open: { value: 'Open', label: 'Not assessed', tone: 'neutral', rank: 0 },
  Covered: { value: 'Covered', label: 'Covered', tone: 'success', rank: 1 },
  Gap: { value: 'Gap', label: 'Gap', tone: 'warning', rank: 2 },
}

export const REQUIREMENT_PRIORITY = {
  'Must Have': { value: 'Must Have', label: 'Must have', tone: 'danger', rank: 0 },
  'Nice to Have': { value: 'Nice to Have', label: 'Nice to have', tone: 'neutral', rank: 1 },
}

/** Work-queue buckets, matching the API's `follow_up` query values. */
export const FOLLOW_UP_FILTER = {
  overdue: { value: 'overdue', label: 'Overdue' },
  today: { value: 'today', label: 'Due today' },
  week: { value: 'week', label: 'Next 7 days' },
  unscheduled: { value: 'unscheduled', label: 'No follow-up set' },
}

const toOptions = (record) =>
  Object.values(record)
    .sort((a, b) => a.rank - b.rank)
    .map(({ value, label }) => ({ value, label }))

export const STATUS_OPTIONS = toOptions(LEAD_STATUS)
export const SOLUTION_TYPE_OPTIONS = toOptions(LEAD_SOLUTION_TYPE)
export const SOURCE_OPTIONS = toOptions(LEAD_SOURCE)
export const LOST_REASON_OPTIONS = toOptions(LEAD_LOST_REASON)
export const ACTIVITY_TYPE_OPTIONS = toOptions(LEAD_ACTIVITY_TYPE)
export const REQUIREMENT_STATUS_OPTIONS = toOptions(REQUIREMENT_STATUS)
export const REQUIREMENT_PRIORITY_OPTIONS = toOptions(REQUIREMENT_PRIORITY)
export const FOLLOW_UP_OPTIONS = Object.values(FOLLOW_UP_FILTER).map(
  ({ value, label }) => ({ value, label }),
)

/** Sentinel for "no filter applied" — empty string keeps <select> happy. */
export const ANY = ''

/**
 * How overdue a follow-up is, as a short human phrase.
 *
 * Returns null when there is nothing to say (no date, or a date still in the
 * future beyond today), so a caller can render nothing rather than "in 6 days"
 * on every row.
 *
 * @param {string|null} date YYYY-MM-DD from the API.
 * @param {Date} [now] Injectable for deterministic tests.
 */
export function followUpUrgency(date, now = new Date()) {
  if (!date) return null

  // Compare calendar days in local time. `next_follow_up_on` is a DATE, so
  // parsing it as an instant would shift it a day in negative-offset zones.
  const [y, m, d] = String(date).split('-').map(Number)
  if (!y || !m || !d) return null

  const target = new Date(y, m - 1, d)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((target - startOfToday) / 86400000)

  if (days < 0) {
    return {
      tone: 'danger',
      label: days === -1 ? 'Overdue by 1 day' : `Overdue by ${Math.abs(days)} days`,
    }
  }
  if (days === 0) return { tone: 'warning', label: 'Due today' }
  if (days === 1) return { tone: 'info', label: 'Due tomorrow' }
  return null
}
