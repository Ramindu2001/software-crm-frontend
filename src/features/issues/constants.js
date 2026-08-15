/**
 * Issue domain vocabulary.
 *
 * These keys are the API's values verbatim — `tickets.status` is
 * enum('Open','In Progress','QA','Resolved') and `tickets.priority` is
 * enum('High','Medium','Low'). Keeping the server's casing as the key means a
 * filter value goes straight onto the query string and a response value looks
 * itself up with no translation table in between, which is one fewer place for
 * the two vocabularies to drift apart.
 *
 * Two consequences worth knowing:
 *   - There is no "Critical" priority. The backend's dashboard counts High as
 *     the closest equivalent. Adding one means an ALTER TABLE on the enum
 *     first, then an entry here.
 *   - There is no "Closed" status. "Resolved" is terminal, and reaching it is
 *     what stamps `completed_at`.
 *
 * Each entry carries its own label and design-system tone, so a badge renders
 * identically in the table, the detail view and the dashboard. `rank` drives
 * sorting — alphabetical order is meaningless for priority.
 */

export const ISSUE_STATUS = {
  Open: { value: 'Open', label: 'Open', tone: 'info', rank: 0 },
  'In Progress': {
    value: 'In Progress',
    label: 'In Progress',
    tone: 'warning',
    rank: 1,
  },
  QA: { value: 'QA', label: 'QA', tone: 'brand', rank: 2 },
  Resolved: { value: 'Resolved', label: 'Resolved', tone: 'success', rank: 3 },
}

export const ISSUE_PRIORITY = {
  High: { value: 'High', label: 'High', tone: 'danger', rank: 0 },
  Medium: { value: 'Medium', label: 'Medium', tone: 'warning', rank: 1 },
  Low: { value: 'Low', label: 'Low', tone: 'neutral', rank: 2 },
}

/** `tickets.category` is enum('Bug','Feature') and is required on create. */
export const ISSUE_CATEGORY = {
  Bug: { value: 'Bug', label: 'Bug', tone: 'danger', rank: 0 },
  Feature: { value: 'Feature', label: 'Feature', tone: 'info', rank: 1 },
}

const toOptions = (record) =>
  Object.values(record)
    .sort((a, b) => a.rank - b.rank)
    .map(({ value, label }) => ({ value, label }))

export const STATUS_OPTIONS = toOptions(ISSUE_STATUS)
export const PRIORITY_OPTIONS = toOptions(ISSUE_PRIORITY)
export const CATEGORY_OPTIONS = toOptions(ISSUE_CATEGORY)

/** Sentinel for "no filter applied" — empty string keeps <select> happy. */
export const ANY = ''
