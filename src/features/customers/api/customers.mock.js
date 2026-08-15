import { matchesQuery, paginate, sortRows } from '@/lib/apiEnvelope'
import { MOCK_CUSTOMERS } from './mockCustomers'

/**
 * Mock customers API.
 *
 * Matches customers.http.js exactly, including what it does NOT offer: the
 * real endpoint is read-only, so there is no createCustomer or updateCustomer
 * here either. A mock that could write records the API cannot would let a
 * feature be built against an endpoint that does not exist.
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

/** Mirrors the mapping in customers.http.js. */
function mapCustomer(raw) {
  return {
    id: raw.id,
    name: raw.company_name,
    contactPerson: raw.contact_person ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
  }
}

const SORT_ACCESSORS = {
  id: (customer) => customer.id,
  name: (customer) => customer.name.toLowerCase(),
  contactPerson: (customer) => customer.contactPerson.toLowerCase(),
  email: (customer) => customer.email.toLowerCase(),
  // The mock has no created_at, so this falls back to insertion order.
  createdAt: (customer) => customer.id,
}

/** The API searches company_name, contact_person and email. */
const SEARCH_FIELDS = ['name', 'contactPerson', 'email']

/**
 * @param {object} [params]
 * @returns {Promise<{data: Array, total: number, filteredTotal: number,
 *   currentPage: number, lastPage: number, perPage: number}>}
 */
export async function listCustomers({
  query = '',
  sortBy = 'name',
  sortDir = 'asc',
  page = 1,
  perPage = 10,
} = {}) {
  await delay()

  const rows = MOCK_CUSTOMERS.map(mapCustomer).filter((customer) =>
    matchesQuery(customer, query, SEARCH_FIELDS),
  )

  const accessor = SORT_ACCESSORS[sortBy] ?? SORT_ACCESSORS.name

  return paginate(sortRows(rows, accessor, sortDir), { page, perPage })
}

/**
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 */
export async function getCustomer(id) {
  await delay(220)

  const match = MOCK_CUSTOMERS.find((row) => String(row.id) === String(id))
  if (!match) throw new NotFoundError(`Customer ${id} was not found.`)

  return mapCustomer(match)
}

/** @returns {Promise<Array<{value: string, label: string}>>} */
export async function listCustomerOptions() {
  await delay(150)
  return MOCK_CUSTOMERS.map((row) => ({
    value: String(row.id),
    label: row.company_name,
  }))
}
