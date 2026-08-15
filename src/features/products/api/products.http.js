import { api } from '@/lib/apiClient'
import { paginate, unwrap } from '@/lib/apiEnvelope'

/**
 * Real product-catalogue endpoints.
 *
 *   GET   /api/products             any logged-in  list (unpaginated)
 *   GET   /api/products/:id         any logged-in  full nested detail
 *   POST  /api/products             Admin          create the whole aggregate
 *   PUT   /api/products/:id         Admin          full replace
 *   PATCH /api/products/:id/status  Admin          activate / deactivate
 *
 * A product is a four-table aggregate — the product row, two requirement
 * lists, its packages, and each package's features. POST and PUT take the
 * whole tree in one body and write it in a single transaction, so this module
 * never has to orchestrate partial saves.
 *
 * There is no DELETE by design: products are referenced by quotation_items,
 * subscriptions and tickets with ON DELETE RESTRICT, so anything ever sold
 * cannot be removed. PATCH /:id/status is the soft delete — it takes a product
 * out of the pickers while leaving the sales history intact.
 *
 * ── Naming ──
 * The API's nested rows are wrapped objects with database column names
 * (`{ id, requirement }`, `package_name`, `annual_fee_1st_year`). The form
 * builder works in plain strings and short names. Both directions of that
 * translation live in this file, so the components never see a column name and
 * the server never sees a UI one.
 */

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

/** UI sort keys mapped to the columns the API will order by. */
const SORT_COLUMNS = { name: 'name', type: 'type', id: 'id' }

/**
 * Requirement and feature rows arrive as `{ id, requirement }`,
 * `{ id, software_requirement }` or `{ id, feature }`. The UI only ever edits
 * the text, and PUT accepts either form back, so they are flattened to
 * strings on the way in.
 */
const toStrings = (rows, key) =>
  (rows ?? []).map((row) => (typeof row === 'string' ? row : (row?.[key] ?? '')))

function mapPackage(raw) {
  return {
    id: raw.id,
    name: raw.package_name,
    // DECIMAL(10,2) columns arrive as JS numbers because the pool runs with
    // decimalNumbers — Number() here is belt-and-braces for a driver change.
    first_year_price: Number(raw.annual_fee_1st_year),
    second_year_price: Number(raw.annual_fee_2nd_year),
    monthly_price: Number(raw.monthly_price),
    features: toStrings(raw.features, 'feature'),
  }
}

/**
 * A list row. `packages_count` is all the list endpoint knows about packages —
 * the packages themselves come only from GET /:id — so `packages` is left
 * absent rather than faked as an empty array, which would render "0 packages"
 * for a product that has several.
 */
function mapProductListItem(raw) {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    description: raw.description ?? '',
    is_active: Boolean(raw.is_active),
    packages_count: Number(raw.packages_count ?? 0),
  }
}

/** The full nested product returned by GET /:id, POST and PUT. */
function mapProductDetail(raw) {
  const packages = (raw.packages ?? []).map(mapPackage)

  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    description: raw.description ?? '',
    is_active: Boolean(raw.is_active),
    basic_requirements: toStrings(raw.basic_requirements, 'requirement'),
    software_requirements: toStrings(
      raw.software_requirements,
      'software_requirement',
    ),
    packages,
    packages_count: packages.length,
  }
}

/** Build the request body POST and PUT share. */
function toRequestBody(input) {
  const body = {
    name: input.name?.trim(),
    description: input.description?.trim() || null,
    type: input.type,
    basic_requirements: (input.basic_requirements ?? []).map((entry) =>
      String(entry).trim(),
    ),
    software_requirements: (input.software_requirements ?? []).map((entry) =>
      String(entry).trim(),
    ),
    packages: (input.packages ?? []).map((pkg) => ({
      package_name: pkg.name?.trim(),
      // All three fee columns are NOT NULL, so none may be omitted. Number()
      // matters: the form's number inputs hand back strings, and the API
      // rejects a string where it wants a decimal.
      annual_fee_1st_year: Number(pkg.first_year_price) || 0,
      annual_fee_2nd_year: Number(pkg.second_year_price) || 0,
      monthly_price: Number(pkg.monthly_price) || 0,
      features: (pkg.features ?? []).map((feature) => String(feature).trim()),
    })),
  }

  // Only sent when the caller actually set it. PUT keeps the current value for
  // an omitted is_active, which is what stops a rename from silently
  // reactivating a product that was deliberately retired.
  if (input.is_active !== undefined) body.is_active = input.is_active

  return body
}

/**
 * List the catalogue.
 *
 * The endpoint is unpaginated — it exists to fill pickers — so filtering and
 * sorting run server-side and the paging is applied here.
 *
 * @param {object} [params]
 * @param {'All'|'Software'|'Service'} [params.type] 'All' sends no filter.
 * @returns {Promise<{data: Array, total: number, filteredTotal: number,
 *   currentPage: number, lastPage: number, perPage: number}>}
 */
export async function listProducts({
  query = '',
  type = 'All',
  isActive,
  sortBy = 'name',
  sortDir = 'asc',
  page = 1,
  perPage = 10,
  signal,
} = {}) {
  const column = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.name

  const payload = await api.get('/products', {
    params: {
      search: query,
      // An unknown type is a 422 naming the real ones, so 'All' must become
      // an absent param rather than being passed through.
      type: type === 'All' ? '' : type,
      is_active: isActive,
      sort: `${column}:${sortDir}`,
    },
    signal,
  })

  const rows = (unwrap(payload) ?? []).map(mapProductListItem)

  return paginate(rows, { page, perPage })
}

/**
 * @param {number|string} id
 * @returns {Promise<object>} The full nested product.
 * @throws {NotFoundError}
 */
export async function getProduct(id) {
  try {
    const payload = await api.get(`/products/${encodeURIComponent(id)}`)
    return mapProductDetail(unwrap(payload))
  } catch (error) {
    if (error.status === 404) {
      throw new NotFoundError(`Product ${id} was not found.`)
    }
    throw error
  }
}

/**
 * Create a product and everything hanging off it, in one transaction.
 * Admin only — other roles get a 403.
 *
 * The 201 body is read back from the database rather than echoed from the
 * request, so what comes back is what was actually committed, ids and all.
 *
 * @param {object} input
 * @returns {Promise<object>}
 */
export async function createProduct(input) {
  const payload = await api.post('/products', toRequestBody(input))
  return mapProductDetail(unwrap(payload))
}

/**
 * Full replacement. Admin only.
 *
 * Every child row is deleted and rewritten, so anything left out of the
 * payload is gone afterwards — send the whole tree, not a patch.
 *
 * @param {number|string} id
 * @param {object} input
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 */
export async function updateProduct(id, input) {
  try {
    const payload = await api.put(
      `/products/${encodeURIComponent(id)}`,
      toRequestBody(input),
    )
    return mapProductDetail(unwrap(payload))
  } catch (error) {
    if (error.status === 404) {
      throw new NotFoundError(`Product ${id} was not found.`)
    }
    throw error
  }
}

/**
 * Activate or retire a product. Admin only.
 *
 * Answers with `{ id, is_active }` rather than the whole product, so this
 * returns just that and the caller merges it into what it already has.
 *
 * @param {number|string} id
 * @param {boolean} isActive
 * @returns {Promise<{id: number, is_active: boolean}>}
 * @throws {NotFoundError}
 */
export async function updateProductStatus(id, isActive) {
  try {
    const payload = await api.patch(`/products/${encodeURIComponent(id)}/status`, {
      is_active: isActive,
    })
    const data = unwrap(payload) ?? {}
    return { id: data.id ?? id, is_active: Boolean(data.is_active) }
  } catch (error) {
    if (error.status === 404) {
      throw new NotFoundError(`Product ${id} was not found.`)
    }
    throw error
  }
}

/**
 * Options for a product picker. Live products only — retired ones stay on
 * historical records but should not be offered for new work.
 *
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
export async function listProductOptions() {
  const payload = await api.get('/products', { params: { is_active: true } })
  return (unwrap(payload) ?? []).map((row) => ({
    value: String(row.id),
    label: row.name,
  }))
}
