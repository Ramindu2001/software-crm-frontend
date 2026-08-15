import { api } from '@/lib/apiClient'
import { paginate, unwrap } from '@/lib/apiEnvelope'

/**
 * Real customers endpoint.
 *
 *   GET /api/customers   any logged-in   the whole list
 *
 * That is the entire surface. There is no POST, no PATCH and no
 * GET /:id — customers are master data the API exposes for pickers, and the
 * backend has no write path for them at all. New records go in through the
 * database directly.
 *
 * Two consequences shape this module:
 *
 *   1. It is unpaginated by design: a dropdown needs every option, not page 1.
 *      The customers table still wants pages, so the slicing happens here
 *      rather than in the hook — which therefore cannot tell this feature from
 *      a server-paginated one.
 *   2. The payload is deliberately lean: id, company_name, contact_person,
 *      email, phone. `address` and `created_at` exist in the table but are not
 *      returned, and there is no status, industry or issue count anywhere in
 *      the schema. The UI reflects exactly these five fields.
 */

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
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
 * The raw column name is an implementation detail of the join it comes from.
 */
function mapCustomer(raw) {
  return {
    id: raw.id,
    name: raw.company_name,
    contactPerson: raw.contact_person ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
  }
}

/**
 * Fetch the list, filtered and sorted by the server.
 *
 * Search runs server-side (it matches company_name, contact_person and email,
 * which is more than a client-side pass over the mapped fields would cover),
 * and paging is applied to the result here.
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
 * Read a single customer.
 *
 * There is no GET /api/customers/:id, so this narrows the list instead. The
 * list carries every field the API exposes, which makes the round trip
 * complete rather than partial — but it does transfer the whole table to find
 * one row, so prefer the record already in hand where there is one.
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
