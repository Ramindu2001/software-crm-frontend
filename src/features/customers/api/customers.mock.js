import { MOCK_CUSTOMERS } from './mockCustomers'

/**
 * Mock customers API standing in for the Laravel backend.
 *
 * Mirrors the issues mock in structure: filtering, sorting and pagination
 * happen here rather than in the component, so swapping to HTTP only changes
 * the import path in api/index.js.
 *
 * No top-level function calls — the bundler can tree-shake this module when
 * the HTTP implementation is selected.
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

// Mutable store standing in for the database. Created customers persist for
// the session so the list reflects them after a refetch.
let store = null

function getStore() {
  store ??= [...MOCK_CUSTOMERS]
  return store
}

/**
 * Sort keys map to comparable values.
 */
const SORT_ACCESSORS = {
  id: (c) => c.id,
  name: (c) => c.name.toLowerCase(),
  company: (c) => c.company.toLowerCase(),
  industry: (c) => c.industry.toLowerCase(),
  status: (c) => (c.status === 'active' ? 0 : 1),
  issueCount: (c) => c.issueCount,
  updatedAt: (c) => new Date(c.updatedAt).getTime(),
  createdAt: (c) => new Date(c.createdAt).getTime(),
}

function matchesQuery(customer, query) {
  if (!query) return true
  return (
    customer.name.toLowerCase().includes(query) ||
    customer.email.toLowerCase().includes(query) ||
    customer.company.toLowerCase().includes(query) ||
    customer.contactName.toLowerCase().includes(query) ||
    customer.industry.toLowerCase().includes(query)
  )
}

/**
 * @param {object} [params]
 * @param {string} [params.query] Free-text search.
 * @param {string} [params.status] 'active', 'inactive', or '' for any.
 * @param {string} [params.sortBy]
 * @param {'asc'|'desc'} [params.sortDir]
 * @param {number} [params.page] 1-indexed.
 * @param {number} [params.perPage]
 * @returns {Promise<{data: Array, total: number, filteredTotal: number, currentPage: number, lastPage: number, perPage: number}>}
 */
export async function listCustomers({
  query = '',
  status = '',
  sortBy = 'updatedAt',
  sortDir = 'desc',
  page = 1,
  perPage = 10,
} = {}) {
  await delay()

  const normalizedQuery = query.trim().toLowerCase()

  const filtered = getStore().filter((customer) => {
    if (status && customer.status !== status) return false
    return matchesQuery(customer, normalizedQuery)
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
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 */
export async function getCustomer(id) {
  await delay(220)

  const numericId = Number(id)
  const customer = getStore().find((c) => c.id === numericId)
  if (!customer) throw new NotFoundError(`Customer ${id} was not found.`)

  return { ...customer }
}

/**
 * @param {object} input
 * @returns {Promise<object>} The created customer.
 */
export async function createCustomer(input) {
  await delay(450)

  const now = new Date().toISOString()
  const nextId = getStore().reduce((max, c) => Math.max(max, c.id), 0) + 1

  const customer = {
    id: nextId,
    name: input.name.trim(),
    email: input.email?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    company: input.company?.trim() || input.name.trim(),
    industry: input.industry?.trim() || 'Other',
    status: 'active',
    issueCount: 0,
    contactName: input.contactName?.trim() || '',
    notes: input.notes?.trim() ?? '',
    createdAt: now,
    updatedAt: now,
  }

  store = [customer, ...getStore()]
  return { ...customer }
}

/**
 * @param {number|string} id
 * @param {object} patch Partial customer fields.
 * @returns {Promise<object>} The updated customer.
 * @throws {NotFoundError}
 */
export async function updateCustomer(id, patch) {
  await delay(260)

  const numericId = Number(id)
  const index = getStore().findIndex((c) => c.id === numericId)
  if (index === -1) throw new NotFoundError(`Customer ${id} was not found.`)

  const updated = {
    ...getStore()[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  }

  store = getStore().map((c, i) => (i === index ? updated : c))
  return { ...updated }
}
