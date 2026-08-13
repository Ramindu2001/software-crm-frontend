import { ISSUE_PRIORITY, ISSUE_STATUS } from '../constants'
import { ASSIGNEES, MOCK_ISSUES } from './mockIssues'

/**
 * Mock issues API standing in for the Laravel backend.
 *
 * Filtering and sorting happen here rather than in the component, matching how
 * a real endpoint behaves — so replacing these functions with fetch() calls
 * should not change the hook or the UI.
 *
 * Note: this module deliberately runs NO function calls at import time. A
 * bundler cannot prove a top-level call is side-effect free, so a single one
 * pins the whole module — and its seed data — into the bundle even when
 * VITE_ISSUES_API=http selects the other implementation.
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

// Mutable store standing in for the database. Created issues persist for the
// session so the list reflects them after a refetch. Initialised lazily: the
// spread is a function call as far as the bundler is concerned.
let store = null

function getStore() {
  store ??= [...MOCK_ISSUES]
  return store
}

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

/**
 * Lookup lists for the create form.
 *
 * Exposed as async functions rather than exported constants so the HTTP
 * implementation can satisfy the same contract by calling real endpoints —
 * and so no component ever imports mock data directly. Derived inside the
 * function rather than at module scope, for the tree-shaking reason above.
 *
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
export async function listAssignees() {
  await delay(150)
  return Object.entries(ASSIGNEES).map(([value, dev]) => ({
    value,
    label: dev.name,
  }))
}

export async function listCustomers() {
  await delay(150)
  return [...new Set(MOCK_ISSUES.map((issue) => issue.customer))]
    .sort()
    .map((customer) => ({ value: customer, label: customer }))
}

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
 * @param {number} [params.page] 1-indexed page number.
 * @param {number} [params.perPage] Rows per page.
 * @returns {Promise<{data: Array, total: number, filteredTotal: number, currentPage: number, lastPage: number, perPage: number}>}
 */
export async function listIssues({
  query = '',
  status = '',
  priority = '',
  sortBy = 'updatedAt',
  sortDir = 'desc',
  page = 1,
  perPage = 10,
} = {}) {
  await delay()

  const normalizedQuery = query.trim().toLowerCase()

  const filtered = getStore().filter((issue) => {
    if (status && issue.status !== status) return false
    if (priority && issue.priority !== priority) return false
    return matchesQuery(issue, normalizedQuery)
  })

  const accessor = SORT_ACCESSORS[sortBy] ?? SORT_ACCESSORS.updatedAt
  const direction = sortDir === 'asc' ? 1 : -1

  const sorted = [...filtered].sort((a, b) => {
    const left = accessor(a)
    const right = accessor(b)
    if (left < right) return -direction
    if (left > right) return direction
    return 0
  })

  // Paginate — clamp page so out-of-range values degrade gracefully.
  const filteredTotal = sorted.length
  const lastPage = Math.max(1, Math.ceil(filteredTotal / perPage))
  const safePage = Math.max(1, Math.min(page, lastPage))
  const start = (safePage - 1) * perPage
  const data = sorted.slice(start, start + perPage)

  return {
    data,
    total: getStore().length,
    filteredTotal,
    currentPage: safePage,
    lastPage,
    perPage,
  }
}

/**
 * @param {string} id
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 */
export async function getIssue(id) {
  await delay(220)

  const issue = getStore().find((candidate) => candidate.id === id)
  if (!issue) throw new NotFoundError(`Issue ${id} was not found.`)

  // Returned by value so callers can't mutate the store by accident.
  return { ...issue }
}

function nextId() {
  const highest = getStore().reduce((max, issue) => {
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

  store = [issue, ...getStore()]
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

  const index = getStore().findIndex((candidate) => candidate.id === id)
  if (index === -1) throw new NotFoundError(`Issue ${id} was not found.`)

  const updated = {
    ...getStore()[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  }

  // map rather than Array.prototype.with(), which is ES2023 and would throw
  // on older browsers — Vite transpiles syntax but does not polyfill methods.
  store = getStore().map((issue, position) => (position === index ? updated : issue))
  return { ...updated }
}
