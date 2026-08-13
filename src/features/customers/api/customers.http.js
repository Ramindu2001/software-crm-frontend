import { api } from '@/lib/apiClient'

/**
 * Real customers endpoints.
 *
 * Paths and payload shapes are a best guess at the Laravel API and will be
 * adjusted once the backend is ready. The contract these functions expose —
 * same arguments and returned shape as customers.mock.js — must stay stable
 * so nothing above api/ has to branch on which implementation is active.
 */

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

const SORT_COLUMNS = {
  id: 'id',
  name: 'name',
  company: 'company',
  industry: 'industry',
  status: 'status',
  issueCount: 'issue_count',
  updatedAt: 'updated_at',
  createdAt: 'created_at',
}

/** Normalises a server record into the shape the UI already expects. */
function mapCustomer(raw) {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    company: raw.company ?? raw.name,
    industry: raw.industry ?? 'Other',
    status: raw.status ?? 'active',
    issueCount: raw.issue_count ?? raw.issueCount ?? 0,
    contactName: raw.contact_name ?? raw.contactName ?? '',
    notes: raw.notes ?? '',
    createdAt: raw.created_at ?? raw.createdAt,
    updatedAt: raw.updated_at ?? raw.updatedAt,
  }
}

/**
 * @param {object} [params]
 * @returns {Promise<{data: Array, total: number, filteredTotal: number, currentPage: number, lastPage: number, perPage: number}>}
 */
export async function listCustomers({
  query = '',
  status = '',
  sortBy = 'updatedAt',
  sortDir = 'desc',
  page = 1,
  perPage = 10,
  signal,
} = {}) {
  const payload = await api.get('/customers', {
    params: {
      search: query,
      status,
      sort: `${SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.updatedAt}:${sortDir}`,
      page,
      per_page: perPage,
    },
    signal,
  })

  const records = payload.data ?? []
  const data = records.map(mapCustomer)

  const filteredTotal = payload.meta?.total ?? data.length
  const total = payload.meta?.unfiltered_total ?? filteredTotal
  const currentPage = payload.meta?.current_page ?? page
  const lastPage = payload.meta?.last_page ?? 1
  const resolvedPerPage = payload.meta?.per_page ?? perPage

  return { data, total, filteredTotal, currentPage, lastPage, perPage: resolvedPerPage }
}

/**
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 */
export async function getCustomer(id) {
  try {
    const payload = await api.get(`/customers/${encodeURIComponent(id)}`)
    return mapCustomer(payload.data ?? payload)
  } catch (error) {
    if (error.status === 404) {
      throw new NotFoundError(`Customer ${id} was not found.`)
    }
    throw error
  }
}

/**
 * @param {object} input
 * @returns {Promise<object>}
 */
export async function createCustomer(input) {
  const payload = await api.post('/customers', {
    name: input.name?.trim(),
    email: input.email?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    company: input.company?.trim() || null,
    industry: input.industry?.trim() || null,
    contact_name: input.contactName?.trim() || null,
    notes: input.notes?.trim() ?? '',
  })

  return mapCustomer(payload.data ?? payload)
}

/**
 * @param {number|string} id
 * @param {object} patch
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 */
export async function updateCustomer(id, patch) {
  try {
    const payload = await api.patch(
      `/customers/${encodeURIComponent(id)}`,
      patch,
    )
    return mapCustomer(payload.data ?? payload)
  } catch (error) {
    if (error.status === 404) {
      throw new NotFoundError(`Customer ${id} was not found.`)
    }
    throw error
  }
}
