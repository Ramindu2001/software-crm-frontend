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

export async function listProducts({ query = '', type = '', page = 1, perPage = 10, signal } = {}) {
  await delay()
  if (signal?.aborted) throw new Error('aborted')

  let results = getStore()

  if (query) {
    const q = query.toLowerCase()
    results = results.filter((p) => p.name.toLowerCase().includes(q))
  }
  
  if (type && type !== 'All') {
    results = results.filter((p) => p.type === type)
  }

  // Sort by name by default
  results.sort((a, b) => a.name.localeCompare(b.name))

  const total = results.length
  const start = (page - 1) * perPage
  const data = results.slice(start, start + perPage)

  return {
    data,
    total: getStore().length,
    filteredTotal: total,
    currentPage: page,
    lastPage: Math.max(1, Math.ceil(total / perPage)),
    perPage,
  }
}

export async function getProduct(id) {
  await delay()
  const product = getStore().find((p) => String(p.id) === String(id))
  if (!product) throw new NotFoundError(`Product ${id} not found`)
  return JSON.parse(JSON.stringify(product)) // deep copy
}

function nextId() {
  const highest = getStore().reduce((max, p) => {
    const numeric = Number.parseInt(String(p.id).replace('PRD-', ''), 10)
    return Number.isNaN(numeric) ? max : Math.max(max, numeric)
  }, 1000)
  return `PRD-${highest + 1}`
}

function generatePackageId() {
  return `PKG-${Math.random().toString(36).substr(2, 9)}`
}

export async function createProduct(input) {
  await delay()
  const now = new Date().toISOString()
  
  const product = {
    id: nextId(),
    name: input.name?.trim(),
    type: input.type,
    is_active: input.is_active ?? true,
    basic_requirements: input.basic_requirements || [],
    software_requirements: input.software_requirements || [],
    packages: (input.packages || []).map(pkg => ({
      id: pkg.id || generatePackageId(),
      name: pkg.name?.trim(),
      first_year_price: Number(pkg.first_year_price) || 0,
      second_year_price: Number(pkg.second_year_price) || 0,
      monthly_price: Number(pkg.monthly_price) || 0,
      features: pkg.features || []
    })),
    createdAt: now,
    updatedAt: now,
  }
  
  store = [product, ...getStore()]
  return JSON.parse(JSON.stringify(product))
}

export async function updateProduct(id, patch) {
  await delay()
  
  const index = getStore().findIndex((candidate) => candidate.id === id)
  if (index === -1) throw new NotFoundError(`Product ${id} was not found.`)

  const updated = {
    ...getStore()[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  
  if (patch.packages) {
    updated.packages = patch.packages.map(pkg => ({
      id: pkg.id || generatePackageId(),
      name: pkg.name?.trim(),
      first_year_price: Number(pkg.first_year_price) || 0,
      second_year_price: Number(pkg.second_year_price) || 0,
      monthly_price: Number(pkg.monthly_price) || 0,
      features: pkg.features || []
    }))
  }

  store = getStore().map((p, position) => (position === index ? updated : p))
  return JSON.parse(JSON.stringify(updated))
}

export async function updateProductStatus(id, isActive) {
  return updateProduct(id, { is_active: isActive })
}
