import { api } from '@/lib/apiClient'

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

function mapProduct(raw) {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    description: raw.description ?? '',
    annual_fee_1st_year: raw.annual_fee_1st_year ?? 0,
    annual_fee_2nd_year: raw.annual_fee_2nd_year ?? 0,
    monthly_price: raw.monthly_price ?? 0,
    createdAt: raw.created_at ?? raw.createdAt,
    updatedAt: raw.updated_at ?? raw.updatedAt,
  }
}

export async function listProducts({ query = '', page = 1, perPage = 10, signal } = {}) {
  const payload = await api.get('/products', {
    params: {
      search: query,
      page,
      per_page: perPage,
    },
    signal,
  })

  const records = payload.data ?? payload ?? []
  const data = records.map(mapProduct)

  const filteredTotal = payload.meta?.total ?? data.length
  const total = payload.meta?.unfiltered_total ?? filteredTotal
  const currentPage = payload.meta?.current_page ?? page
  const lastPage = payload.meta?.last_page ?? 1
  const resolvedPerPage = payload.meta?.per_page ?? perPage

  return { data, total, filteredTotal, currentPage, lastPage, perPage: resolvedPerPage }
}

export async function getProduct(id) {
  try {
    const payload = await api.get(`/products/${encodeURIComponent(id)}`)
    return mapProduct(payload.data ?? payload)
  } catch (error) {
    if (error.status === 404) {
      throw new NotFoundError(`Product ${id} was not found.`)
    }
    throw error
  }
}

export async function createProduct(input) {
  const payload = await api.post('/products', {
    name: input.name?.trim(),
    type: input.type,
    description: input.description?.trim(),
    annual_fee_1st_year: Number(input.annual_fee_1st_year),
    annual_fee_2nd_year: Number(input.annual_fee_2nd_year),
    monthly_price: Number(input.monthly_price),
  })

  return mapProduct(payload.data ?? payload)
}
