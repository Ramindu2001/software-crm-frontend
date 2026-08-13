import { MOCK_PRODUCTS } from './mockProducts'

const LATENCY_MS = 320
const delay = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms))

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

let store = null
function getStore() {
  store ??= [...MOCK_PRODUCTS]
  return store
}

export async function listProducts({ query = '', page = 1, perPage = 10, signal } = {}) {
  await delay()
  if (signal?.aborted) throw new Error('aborted')

  let results = getStore()

  if (query) {
    const q = query.toLowerCase()
    results = results.filter((p) => p.name.toLowerCase().includes(q))
  }

  // Sort by name by default
  results.sort((a, b) => a.name.localeCompare(b.name))

  const total = results.length
  const start = (page - 1) * perPage
  const data = results.slice(start, start + perPage)

  return {
    data,
    total,
    filteredTotal: total,
    currentPage: page,
    lastPage: Math.ceil(total / perPage) || 1,
    perPage,
  }
}

export async function getProduct(id) {
  await delay()
  const product = getStore().find((p) => String(p.id) === String(id))
  if (!product) throw new NotFoundError(`Product ${id} not found`)
  return product
}

export async function createProduct(input) {
  await delay()
  const product = {
    id: Math.max(...getStore().map((p) => p.id), 0) + 1,
    name: input.name,
    type: input.type,
    description: input.description,
    annual_fee_1st_year: Number(input.annual_fee_1st_year),
    annual_fee_2nd_year: Number(input.annual_fee_2nd_year),
    monthly_price: Number(input.monthly_price),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  
  getStore().push(product)
  return product
}
