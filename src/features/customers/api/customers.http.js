import { api } from '@/lib/apiClient'
import { paginate, unwrap } from '@/lib/apiEnvelope'

/**
 * Real customer endpoints.
 *
 *   GET  /api/customers       any logged-in   the whole list
 *   POST /api/customers       Admin, Support  create
 *   PUT  /api/customers/:id   Admin, Support  full replacement
 *
 * Two things shape this module:
 *
 *   1. The list is unpaginated by design — a picker needs every option, not
 *      page 1 — and it carries every column a profile view would show,
 *      `address` included. That is also why there is no GET /:id: nothing has
 *      to go looking for a single customer, and both writes return the full
 *      row. `getCustomer` below narrows the list rather than calling an
 *      endpoint that does not exist.
 *      The table still wants pages, so the slicing happens here, which is what
 *      keeps the hook from being able to tell this feature from a
 *      server-paginated one.
 *
 *   2. PUT is a **full replacement**. Omitting `phone` or `address` sets them
 *      to NULL rather than keeping the stored value. That is what makes an
 *      edit form behave — a user who empties the address box expects it gone —
 *      but it means a partial body is destructive, so `updateCustomer` always
 *      sends every field.
 *
 * There is no DELETE: customers are referenced by tickets, quotations and
 * subscriptions, so one with history could not be removed at the database
 * anyway, and the table has no status column to soft-delete with.
 */

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

/**
 * Thrown when the email belongs to another customer.
 *
 * Its own type because a 409 here is a field-level problem the form can point
 * at, not a generic failure: the server's message names the id and company
 * already holding the address.
 */
export class DuplicateEmailError extends Error {
  constructor(message) {
    super(message)
    this.name = 'DuplicateEmailError'
    this.status = 409
    /** The form binds this to the email input. */
    this.field = 'email'
  }
}

/** UI sort keys mapped to the columns the API will order by. */
const SORT_COLUMNS = {
  id: 'id',
  name: 'company_name',
  contactPerson: 'contact_person',
  email: 'email',
  createdAt: 'created_at',
}

const DEFAULT_SORT_KEY = 'name'

/**
 * `company_name` becomes `name` because that is what every screen calls it.
 * The raw column name is an implementation detail of the table it comes from.
 *
 * Nullable columns are normalised to '' so form inputs stay controlled — React
 * warns when a value flips between null and a string.
 */
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
 * Build the request body POST and PUT share.
 *
 * Optional fields collapse to `undefined` when blank, which the client strips
 * from the payload — and an absent key is exactly how the API reads "store
 * NULL". Sending '' instead would fail validation, since the validator counts
 * an empty string as missing and `phone: ''` would then read as a malformed
 * number rather than an omitted one.
 */
function toRequestBody(input) {
  return {
    company_name: input.name?.trim(),
    contact_person: input.contactPerson?.trim(),
    // Lowercased server-side; sent as typed.
    email: input.email?.trim(),
    phone: input.phone?.trim() || undefined,
    address: input.address?.trim() || undefined,
  }
}

/** 409 is always the email clash — it is the only uniqueness rule here. */
function translateWriteError(error) {
  if (error.status === 409) return new DuplicateEmailError(error.message)
  return error
}

/**
 * Fetch the list, filtered and sorted by the server, paged here.
 *
 * Search runs server-side across company, contact and email. It deliberately
 * does not cover `address` — free text would match half the list on a city
 * name — so filtering client-side instead would silently widen it.
 *
 * @param {object} [params]
 * @returns {Promise<{data: Array, total: number, filteredTotal: number,
 *   currentPage: number, lastPage: number, perPage: number}>}
 */
export async function listCustomers({
  query = '',
  sortBy = DEFAULT_SORT_KEY,
  sortDir = 'asc',
  page = 1,
  perPage = 10,
  signal,
} = {}) {
  const column = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS[DEFAULT_SORT_KEY]

  const payload = await api.get('/customers', {
    params: {
      search: query,
      sort: `${column}:${sortDir}`,
    },
    signal,
  })

  const rows = (unwrap(payload) ?? []).map(mapCustomer)

  return paginate(rows, { page, perPage })
}

/**
 * Read a single customer by narrowing the list.
 *
 * There is no GET /:id, and there does not need to be — the list carries every
 * column. Prefer the record already in hand where there is one; this transfers
 * the whole table to find one row.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 */
export async function getCustomer(id) {
  const payload = await api.get('/customers')
  const rows = unwrap(payload) ?? []

  const match = rows.find((row) => String(row.id) === String(id))
  if (!match) throw new NotFoundError(`Customer ${id} was not found.`)

  return mapCustomer(match)
}

/**
 * Create a customer. Requires the Admin or Support role.
 *
 * The 201 body is read back from the database rather than echoed, so what
 * comes back is what was committed — trimmed strings, lowercased email, and
 * nulls where optional fields were omitted.
 *
 * @param {{name: string, contactPerson: string, email: string,
 *   phone?: string, address?: string}} input
 * @returns {Promise<object>}
 * @throws {DuplicateEmailError} When another customer holds that email.
 */
export async function createCustomer(input) {
  try {
    const payload = await api.post('/customers', toRequestBody(input))
    return mapCustomer(unwrap(payload))
  } catch (error) {
    throw translateWriteError(error)
  }
}

/**
 * Full replacement. Requires Admin or Support.
 *
 * Send every field: anything omitted is cleared, not kept. Submitting the
 * customer's own email is fine — the uniqueness check excludes the row being
 * updated — but another customer's email is a 409.
 *
 * @param {number|string} id
 * @param {object} input Same shape as createCustomer.
 * @returns {Promise<object>}
 * @throws {NotFoundError|DuplicateEmailError}
 */
export async function updateCustomer(id, input) {
  try {
    const payload = await api.put(
      `/customers/${encodeURIComponent(id)}`,
      toRequestBody(input),
    )
    return mapCustomer(unwrap(payload))
  } catch (error) {
    if (error.status === 404) {
      throw new NotFoundError(`Customer ${id} was not found.`)
    }
    throw translateWriteError(error)
  }
}

/**
 * Options for a customer picker: every customer, no paging.
 * Shared by the issue and quotation forms.
 *
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
export async function listCustomerOptions() {
  const payload = await api.get('/customers')
  return (unwrap(payload) ?? []).map((row) => ({
    value: String(row.id),
    label: row.company_name,
  }))
}
