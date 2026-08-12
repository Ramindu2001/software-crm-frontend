import { ISSUE_PRIORITY, ISSUE_STATUS } from '../constants'
import { ASSIGNEES, MOCK_ISSUES } from './mockIssues'

/**
 * Mock issues API standing in for the Laravel backend.
 *
 * Filtering and sorting happen here rather than in the component, matching how
 * a real endpoint behaves — so replacing these functions with fetch() calls
 * should not change the hook or the UI.
 */

const LATENCY_MS = 320

const delay = (ms = LATENCY_MS) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

// Module-level mutable store, standing in for the database. Created issues
// persist for the session so the list reflects them after a refetch.
let store = [...MOCK_ISSUES]

/**
 * Sort keys map to comparable values. Status and priority sort by `rank`
 * rather than label — alphabetically, "critical" would fall after "high".
 */
const SORT_ACCESSORS = {
  id: (issue) => issue.id,
  title: (issue) => issue.title.toLowerCase(),
  status: (issue) => ISSUE_STATUS[issue.status]?.rank ?? 99,
  priority: (issue) => ISSUE_PRIORITY[issue.priority]?.rank ?? 99,
  // ￿ sorts unassigned last when ascending.
  assignee: (issue) => issue.assignee?.name.toLowerCase() ?? '￿',
  updatedAt: (issue) => new Date(issue.updatedAt).getTime(),
}

export const SORTABLE_FIELDS = Object.keys(SORT_ACCESSORS)

function matchesQuery(issue, query) {
  if (!query) return true
  return (
    issue.id.toLowerCase().includes(query) ||
    issue.title.toLowerCase().includes(query) ||
    issue.customer.toLowerCase().includes(query) ||
    Boolean(issue.assignee?.name.toLowerCase().includes(query))
  )
}

/**
 * @param {object} [params]
 * @param {string} [params.query] Free-text across id, title, customer, assignee.
 * @param {string} [params.status] Empty string means "any".
 * @param {string} [params.priority]
 * @param {string} [params.sortBy]
 * @param {'asc'|'desc'} [params.sortDir]
 * @returns {Promise<{data: Array, total: number, filteredTotal: number}>}
 */
export async function listIssues({
  query = '',
  status = '',
  priority = '',
  sortBy = 'updatedAt',
  sortDir = 'desc',
} = {}) {
  await delay()

  const normalizedQuery = query.trim().toLowerCase()

  const filtered = store.filter((issue) => {
    if (status && issue.status !== status) return false
    if (priority && issue.priority !== priority) return false
    return matchesQuery(issue, normalizedQuery)
  })

  const accessor = SORT_ACCESSORS[sortBy] ?? SORT_ACCESSORS.updatedAt
  const direction = sortDir === 'asc' ? 1 : -1

  const data = [...filtered].sort((a, b) => {
    const left = accessor(a)
    const right = accessor(b)
    if (left < right) return -direction
    if (left > right) return direction
    return 0
  })

  return { data, total: store.length, filteredTotal: data.length }
}

/**
 * @param {string} id
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 */
export async function getIssue(id) {
  await delay(220)

  const issue = store.find((candidate) => candidate.id === id)
  if (!issue) throw new NotFoundError(`Issue ${id} was not found.`)

  // Returned by value so callers can't mutate the store by accident.
  return { ...issue }
}

function nextId() {
  const highest = store.reduce((max, issue) => {
    const numeric = Number.parseInt(issue.id.replace('SYN-', ''), 10)
    return Number.isNaN(numeric) ? max : Math.max(max, numeric)
  }, 1000)
  return `SYN-${highest + 1}`
}

/**
 * @param {object} input
 * @returns {Promise<object>} The created issue.
 */
export async function createIssue(input) {
  await delay(450)

  const now = new Date().toISOString()
  const issue = {
    id: nextId(),
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    status: input.status || 'open',
    priority: input.priority || 'medium',
    assignee: input.assigneeKey ? ASSIGNEES[input.assigneeKey] : null,
    reporter: {
      name: input.reporterName?.trim() || 'Unknown',
      email: input.reporterEmail?.trim() ?? '',
    },
    customer: input.customer?.trim() || 'Unassigned',
    createdAt: now,
    updatedAt: now,
  }

  store = [issue, ...store]
  return { ...issue }
}

/**
 * @param {string} id
 * @param {object} patch Partial issue fields.
 * @returns {Promise<object>} The updated issue.
 * @throws {NotFoundError}
 */
export async function updateIssue(id, patch) {
  await delay(260)

  const index = store.findIndex((candidate) => candidate.id === id)
  if (index === -1) throw new NotFoundError(`Issue ${id} was not found.`)

  const updated = {
    ...store[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  }

  // map rather than Array.prototype.with(), which is ES2023 and would throw
  // on older browsers — Vite transpiles syntax but does not polyfill methods.
  store = store.map((issue, position) => (position === index ? updated : issue))
  return { ...updated }
}
