import { api } from '@/lib/apiClient'

/**
 * Real issues endpoints.
 *
 * Paths, query parameter names and payload shapes are a best guess at the
 * Laravel API and are the first thing to adjust once it exists. What must NOT
 * change is the contract these functions expose — the same arguments and the
 * same returned shape as issues.mock.js, so nothing above api/ has to care
 * which one is active.
 */

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

/** UI sort keys mapped to backend column names. */
const SORT_COLUMNS = {
  id: 'reference',
  title: 'title',
  status: 'status',
  priority: 'priority',
  assignee: 'assignee',
  updatedAt: 'updated_at',
}

function deriveInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts.at(-1)[0]).toUpperCase()
}

function mapPerson(raw) {
  if (!raw) return null
  return {
    name: raw.name,
    initials: raw.initials ?? deriveInitials(raw.name),
  }
}

/** Normalises a server record into the shape the UI already expects. */
function mapIssue(raw) {
  return {
    id: raw.reference ?? String(raw.id),
    title: raw.title,
    description: raw.description ?? '',
    status: raw.status,
    priority: raw.priority,
    assignee: mapPerson(raw.assignee),
    reporter: {
      name: raw.reporter?.name ?? 'Unknown',
      email: raw.reporter?.email ?? '',
    },
    // Accepts either a nested relation or a plain string.
    customer: raw.customer?.name ?? raw.customer ?? 'Unassigned',
    createdAt: raw.created_at ?? raw.createdAt,
    updatedAt: raw.updated_at ?? raw.updatedAt,
  }
}

/**
 * @param {object} [params] Same shape the mock accepts.
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
  signal,
} = {}) {
  const payload = await api.get('/issues', {
    // Empty values are stripped by the client, so "any" filters send nothing.
    params: {
      search: query,
      status,
      priority,
      sort: `${SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.updatedAt}:${sortDir}`,
      page,
      per_page: perPage,
    },
    signal,
  })

  const records = payload.data ?? []
  const data = records.map(mapIssue)

  // Laravel's paginator reports the filtered count in meta.total. The
  // unfiltered count needs its own field — `meta.unfiltered_total` here — and
  // falls back to the filtered count so the "X of Y" label degrades sanely.
  const filteredTotal = payload.meta?.total ?? data.length
  const total = payload.meta?.unfiltered_total ?? filteredTotal
  const currentPage = payload.meta?.current_page ?? page
  const lastPage = payload.meta?.last_page ?? 1
  const resolvedPerPage = payload.meta?.per_page ?? perPage

  return { data, total, filteredTotal, currentPage, lastPage, perPage: resolvedPerPage }
}

/**
 * @param {string} id
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 */
export async function getIssue(id) {
  try {
    const payload = await api.get(`/issues/${encodeURIComponent(id)}`)
    return mapIssue(payload.data ?? payload)
  } catch (error) {
    // Translated so callers can keep catching one error type regardless of
    // which implementation is active.
    if (error.status === 404) {
      throw new NotFoundError(`Issue ${id} was not found.`)
    }
    throw error
  }
}

/**
 * @param {object} input
 * @returns {Promise<object>}
 */
export async function createIssue(input) {
  const payload = await api.post('/issues', {
    title: input.title?.trim(),
    description: input.description?.trim() ?? '',
    category: input.category || 'Bug',
    priority: input.priority || 'Medium',
    customer_id: input.customerId,
    product_id: input.productId,
    assigned_developer_id: input.assigneeId || null,
  })

  return mapIssue(payload.data ?? payload)
}

/**
 * Lookup lists for the create form.
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
export async function listAssignees() {
  const payload = await api.get('/users', { params: { role: 'Developer' } })
  const records = payload.data ?? payload ?? []
  return records.map((user) => ({ value: String(user.id), label: user.name }))
}

export async function listCustomers() {
  const payload = await api.get('/customers')
  const records = payload.data ?? payload ?? []
  return records.map((customer) => ({
    value: String(customer.id ?? customer.name),
    label: customer.name,
  }))
}

export async function listProducts() {
  const payload = await api.get('/products')
  const records = payload.data ?? payload ?? []
  return records.map((product) => ({
    value: String(product.id),
    label: product.name,
  }))
}

/**
 * @param {string} id
 * @param {object} patch
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 */
export async function updateIssue(id, patch) {
  try {
    const payload = await api.patch(
      `/issues/${encodeURIComponent(id)}`,
      patch,
    )
    return mapIssue(payload.data ?? payload)
  } catch (error) {
    if (error.status === 404) {
      throw new NotFoundError(`Issue ${id} was not found.`)
    }
    throw error
  }
}
