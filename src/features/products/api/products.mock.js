import { matchesQuery, paginate, sortRows } from '@/lib/apiEnvelope'
import { MOCK_PRODUCTS } from './mockProducts'

/**
 * Mock product-catalogue API.
 *
 * Matches products.http.js exactly, down to the two endpoints that answer with
 * less than the whole product: `updateProductStatus` returns only
 * `{ id, is_active }`, and list rows carry `packages_count` rather than the
 * packages themselves.
 *
 * No top-level function calls, so the bundler can drop this module when the
 * HTTP implementation is selected.
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

// Mutable store standing in for the database.
let store = null

function getStore() {
  store ??= MOCK_PRODUCTS.map((product) => structuredClone(product))
  return store
}

const SORT_ACCESSORS = {
  id: (product) => product.id,
  name: (product) => product.name.toLowerCase(),
  type: (product) => product.type,
}

/** The API searches name and description. */
const SEARCH_FIELDS = ['name', 'description']

/** Strip the nested tree the list endpoint does not return. */
const toListItem = (product) => ({
  id: product.id,
  name: product.name,
  type: product.type,
  description: product.description ?? '',
  is_active: product.is_active,
  packages_count: product.packages.length,
})

const withCount = (product) => ({
  ...structuredClone(product),
  packages_count: product.packages.length,
})

export async function listProducts({
  query = '',
  type = 'All',
  isActive,
  sortBy = 'name',
  sortDir = 'asc',
  page = 1,
  perPage = 10,
} = {}) {
  await delay()

  const rows = getStore()
    .filter((product) => {
      if (type && type !== 'All' && product.type !== type) return false
      if (isActive !== undefined && product.is_active !== isActive) return false
      return matchesQuery(product, query, SEARCH_FIELDS)
    })
    .map(toListItem)

  const accessor = SORT_ACCESSORS[sortBy] ?? SORT_ACCESSORS.name

  return paginate(sortRows(rows, accessor, sortDir), { page, perPage })
}

export async function getProduct(id) {
  await delay()

  const product = getStore().find((entry) => String(entry.id) === String(id))
  if (!product) throw new NotFoundError(`Product ${id} was not found.`)

  return withCount(product)
}

const nextId = (rows) => rows.reduce((max, row) => Math.max(max, row.id), 0) + 1

/** Package ids are assigned by the database, so the mock assigns them too. */
function buildPackages(rawPackages = []) {
  let seed = Date.now()

  return rawPackages.map((pkg) => ({
    id: (seed += 1),
    name: pkg.name?.trim(),
    first_year_price: Number(pkg.first_year_price) || 0,
    second_year_price: Number(pkg.second_year_price) || 0,
    monthly_price: Number(pkg.monthly_price) || 0,
    features: (pkg.features ?? []).map((feature) => String(feature).trim()),
  }))
}

function buildProduct(input, id) {
  return {
    id,
    name: input.name?.trim(),
    description: input.description?.trim() ?? '',
    type: input.type,
    is_active: input.is_active ?? true,
    basic_requirements: (input.basic_requirements ?? []).map((entry) =>
      String(entry).trim(),
    ),
    software_requirements: (input.software_requirements ?? []).map((entry) =>
      String(entry).trim(),
    ),
    packages: buildPackages(input.packages),
  }
}

export async function createProduct(input) {
  await delay()

  const product = buildProduct(input, nextId(getStore()))
  store = [product, ...getStore()]

  return withCount(product)
}

/**
 * Full replacement, like PUT. Child rows are rebuilt rather than merged, so
 * anything left out of the payload is gone afterwards.
 *
 * is_active is the one exception: omitted means "keep the current value",
 * because it has its own endpoint and a rename should not reactivate a
 * retired product.
 */
export async function updateProduct(id, input) {
  await delay()

  const index = getStore().findIndex((entry) => String(entry.id) === String(id))
  if (index === -1) throw new NotFoundError(`Product ${id} was not found.`)

  const existing = getStore()[index]
  const updated = buildProduct(
    { ...input, is_active: input.is_active ?? existing.is_active },
    existing.id,
  )

  store = getStore().map((product, position) =>
    position === index ? updated : product,
  )

  return withCount(updated)
}

/** Returns only `{ id, is_active }`, matching the API. */
export async function updateProductStatus(id, isActive) {
  await delay(200)

  const index = getStore().findIndex((entry) => String(entry.id) === String(id))
  if (index === -1) throw new NotFoundError(`Product ${id} was not found.`)

  const updated = { ...getStore()[index], is_active: isActive }
  store = getStore().map((product, position) =>
    position === index ? updated : product,
  )

  return { id: updated.id, is_active: updated.is_active }
}

export async function listProductOptions() {
  await delay(150)
  return getStore()
    .filter((product) => product.is_active)
    .map((product) => ({ value: String(product.id), label: product.name }))
}
