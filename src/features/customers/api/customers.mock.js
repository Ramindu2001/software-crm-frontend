import { matchesQuery, paginate, sortRows } from '@/lib/apiEnvelope'
import { MOCK_CUSTOMERS } from './mockCustomers'

/**
 * Mock customers API.
 *
 * Matches customers.http.js, including the rules that are easy to lose in a
 * mock and painful to discover against the real server:
 *
 *   - email uniqueness is enforced, throwing DuplicateEmailError (409), and
 *     an update excludes its own row from the check
 *   - updateCustomer is a FULL replacement: omitted phone/address are cleared
 *   - search covers company, contact and email but NOT address
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

export class DuplicateEmailError extends Error {
  constructor(message) {
    super(message)
    this.name = 'DuplicateEmailError'
    this.status = 409
    this.field = 'email'
  }
}

// Mutable store standing in for the database.
let store = null

function getStore() {
  store ??= [...MOCK_CUSTOMERS]
  return store
}

/** Mirrors the mapping in customers.http.js. */
function mapCustomer(raw) {
  return {
    id: raw.id,
    name: raw.company_name,
    contactPerson: raw.contact_person ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    address: raw.address ?? '',
  }
}

/**
 * Build the stored row. Optional fields become null when blank, matching the
 * API — "never given" and "cleared" read the same way.
 */
function toRow(input, id) {
  return {
    id,
    company_name: input.name?.trim(),
    contact_person: input.contactPerson?.trim(),
    // The server lowercases the email; the mock does too, so a round trip
    // looks identical either way.
    email: input.email?.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
  }
}

/** @throws {DuplicateEmailError} */
function assertEmailAvailable(email, excludeId) {
  const needle = String(email).trim().toLowerCase()
  const clash = getStore().find(
    (row) => row.email.toLowerCase() === needle && row.id !== excludeId,
  )

  if (clash) {
    throw new DuplicateEmailError(
      `Another customer (id ${clash.id}, ${clash.company_name}) already uses the email ${needle}`,
    )
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

/** address is returned but not searched, matching the API. */
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

  const rows = getStore()
    .map(mapCustomer)
    .filter((customer) => matchesQuery(customer, query, SEARCH_FIELDS))

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

  const match = getStore().find((row) => String(row.id) === String(id))
  if (!match) throw new NotFoundError(`Customer ${id} was not found.`)

  return mapCustomer(match)
}

/**
 * @param {object} input
 * @returns {Promise<object>} The created customer.
 * @throws {DuplicateEmailError}
 */
export async function createCustomer(input) {
  await delay(450)

  assertEmailAvailable(input.email)

  const nextId = getStore().reduce((max, row) => Math.max(max, row.id), 0) + 1
  const row = toRow(input, nextId)

  store = [...getStore(), row]
  return mapCustomer(row)
}

/**
 * Full replacement — omitted phone/address are cleared, not kept.
 *
 * @param {number|string} id
 * @param {object} input
 * @returns {Promise<object>} The updated customer.
 * @throws {NotFoundError|DuplicateEmailError}
 */
export async function updateCustomer(id, input) {
  await delay(400)

  const index = getStore().findIndex((row) => String(row.id) === String(id))
  if (index === -1) throw new NotFoundError(`Customer ${id} was not found.`)

  const existing = getStore()[index]
  assertEmailAvailable(input.email, existing.id)

  const updated = toRow(input, existing.id)
  store = getStore().map((row, position) => (position === index ? updated : row))

  return mapCustomer(updated)
}

/** @returns {Promise<Array<{value: string, label: string}>>} */
export async function listCustomerOptions() {
  await delay(150)
  return getStore().map((row) => ({
    value: String(row.id),
    label: row.company_name,
  }))
}
