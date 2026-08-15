import { ISSUE_PRIORITY, ISSUE_STATUS } from '../constants'
import { ASSIGNEES, CUSTOMERS, MOCK_ISSUES, PRODUCTS } from './mockIssues'

/**
 * Mock issues API.
 *
 * Filtering, sorting and pagination happen here rather than in the component,
 * matching how the real endpoint behaves — so swapping these functions for the
 * HTTP implementation should not change the hook or the UI.
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
 * rather than label — alphabetically, "Resolved" would fall before "QA".
 *
 * The key set matches SORT_COLUMNS in issues.http.js: no `updatedAt`, because
 * tickets carry only a created timestamp.
 */
const SORT_ACCESSORS = {
  id: (issue) => issue.id,
  title: (issue) => issue.title.toLowerCase(),
  status: (issue) => ISSUE_STATUS[issue.status]?.rank ?? 99,
  priority: (issue) => ISSUE_PRIORITY[issue.priority]?.rank ?? 99,
  category: (issue) => issue.category,
  createdAt: (issue) => new Date(issue.createdAt).getTime(),
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
  return Object.values(ASSIGNEES).map((dev) => ({
    value: String(dev.id),
    label: dev.name,
  }))
}

export async function listCustomers() {
  await delay(150)
  return CUSTOMERS.map((entry) => ({
    value: String(entry.id),
    label: entry.name,
  }))
}

export async function listProducts() {
  await delay(150)
  return PRODUCTS.map((entry) => ({
    value: String(entry.id),
    label: entry.name,
  }))
}

/** The API searches title and description only, so this does too. */
function matchesQuery(issue, query) {
  if (!query) return true
  return (
    issue.title.toLowerCase().includes(query) ||
    issue.description.toLowerCase().includes(query)
  )
}

/**
 * @param {object} [params]
 * @param {string} [params.query] Free text across title and description.
 * @param {string} [params.status] Empty string means "any".
 * @param {string} [params.priority]
 * @param {string} [params.category]
 * @param {string} [params.sortBy]
 * @param {'asc'|'desc'} [params.sortDir]
 * @param {number} [params.page] 1-indexed page number.
 * @param {number} [params.perPage] Rows per page.
 * @returns {Promise<{data: Array, total: number, filteredTotal: number,
 *   currentPage: number, lastPage: number, perPage: number}>}
 */
export async function listIssues({
  query = '',
  status = '',
  priority = '',
  category = '',
  sortBy = 'createdAt',
  sortDir = 'desc',
  page = 1,
  perPage = 10,
} = {}) {
  await delay()

  const normalizedQuery = query.trim().toLowerCase()

  const filtered = getStore().filter((issue) => {
    if (status && issue.status !== status) return false
    if (priority && issue.priority !== priority) return false
    if (category && issue.category !== category) return false
    return matchesQuery(issue, normalizedQuery)
  })

  const accessor = SORT_ACCESSORS[sortBy] ?? SORT_ACCESSORS.createdAt
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
    // The API reports only the filtered count, so the mock does the same
    // rather than offering a number the real implementation cannot.
    total: filteredTotal,
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

  // The API accepts "SYN-1042" or "1042", so the mock resolves both.
  const reference = String(id).toUpperCase().startsWith('SYN-')
    ? String(id).toUpperCase()
    : `SYN-${id}`

  const issue = getStore().find((candidate) => candidate.id === reference)
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

const findById = (list, id) =>
  list.find((entry) => String(entry.id) === String(id)) ?? null

/**
 * @param {object} input
 * @returns {Promise<object>} The created issue.
 */
export async function createIssue(input) {
  await delay(450)

  const assignee = input.assigneeId ? ASSIGNEES[input.assigneeId] ?? null : null

  const issue = {
    id: nextId(),
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    // The API always creates an issue as Open; status is not an input.
    status: 'Open',
    priority: input.priority || 'Medium',
    category: input.category || 'Bug',
    customer: findById(CUSTOMERS, input.customerId) ?? {
      id: null,
      name: 'Unknown',
    },
    product: findById(PRODUCTS, input.productId) ?? { id: null, name: 'Unknown' },
    assignee,
    createdAt: new Date().toISOString(),
    completedAt: null,
    comments: [],
  }

  store = [issue, ...getStore()]
  return { ...issue }
}

/**
 * Move an issue through the workflow.
 *
 * Returns only `{ status }`, matching the API — its PATCH endpoint answers
 * with the new status rather than the whole record.
 *
 * Also maintains completedAt the way the server does: stamped the first time
 * an issue reaches Resolved, preserved on Resolved -> Resolved, and cleared
 * when a resolved issue is reopened.
 *
 * @param {string} id
 * @param {string} status
 * @returns {Promise<{status: string}>}
 * @throws {NotFoundError}
 */
export async function updateIssueStatus(id, status) {
  await delay(260)

  const reference = String(id).toUpperCase().startsWith('SYN-')
    ? String(id).toUpperCase()
    : `SYN-${id}`

  const index = getStore().findIndex((candidate) => candidate.id === reference)
  if (index === -1) throw new NotFoundError(`Issue ${id} was not found.`)

  const current = getStore()[index]
  const isResolved = status === 'Resolved'
  const wasResolved = current.status === 'Resolved'

  let completedAt = current.completedAt
  if (isResolved && !wasResolved) completedAt = new Date().toISOString()
  else if (!isResolved && wasResolved) completedAt = null

  const updated = { ...current, status, completedAt }

  // map rather than Array.prototype.with(), which is ES2023 and would throw
  // on older browsers — Vite transpiles syntax but does not polyfill methods.
  store = getStore().map((issue, position) =>
    position === index ? updated : issue,
  )

  return { status }
}
