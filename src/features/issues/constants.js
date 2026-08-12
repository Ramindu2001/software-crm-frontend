/**
 * Issue domain vocabulary.
 *
 * Each entry carries its own display label and design-system tone, so a
 * "Critical" badge renders identically in the table, the detail view and the
 * dashboard. `rank` drives sorting — alphabetical order is meaningless for
 * priority (critical would sort after high).
 */

export const ISSUE_STATUS = {
  open: { value: 'open', label: 'Open', tone: 'info', rank: 0 },
  in_progress: {
    value: 'in_progress',
    label: 'In Progress',
    tone: 'warning',
    rank: 1,
  },
  resolved: { value: 'resolved', label: 'Resolved', tone: 'success', rank: 2 },
  closed: { value: 'closed', label: 'Closed', tone: 'neutral', rank: 3 },
}

export const ISSUE_PRIORITY = {
  critical: { value: 'critical', label: 'Critical', tone: 'danger', rank: 0 },
  high: { value: 'high', label: 'High', tone: 'warning', rank: 1 },
  medium: { value: 'medium', label: 'Medium', tone: 'info', rank: 2 },
  low: { value: 'low', label: 'Low', tone: 'neutral', rank: 3 },
}

const toOptions = (record) =>
  Object.values(record)
    .sort((a, b) => a.rank - b.rank)
    .map(({ value, label }) => ({ value, label }))

export const STATUS_OPTIONS = toOptions(ISSUE_STATUS)
export const PRIORITY_OPTIONS = toOptions(ISSUE_PRIORITY)

/** Sentinel for "no filter applied" — empty string keeps <select> happy. */
export const ANY = ''
