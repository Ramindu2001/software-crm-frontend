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
    id: raw.reference ?? String(raw.id),
    name: raw.name,
    type: raw.type,
    is_active: Boolean(raw.is_active),
    basic_requirements: raw.basic_requirements ?? [],
    software_requirements: raw.software_requirements ?? [],
    packages: (raw.packages ?? []).map(pkg => ({
      id: String(pkg.id),
      name: pkg.name,
      first_year_price: Number(pkg.first_year_price),
      second_year_price: Number(pkg.second_year_price),
      monthly_price: Number(pkg.monthly_price),
      features: pkg.features ?? []
    })),
    createdAt: raw.created_at ?? raw.createdAt,
    updatedAt: raw.updated_at ?? raw.updatedAt,
  }
}

export async function listProducts({ query = '', type = '', page = 1, perPage = 10, signal } = {}) {
  const payload = await api.get('/products', {
    params: {
      search: query,
      type: type === 'All' ? '' : type,
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
    is_active: input.is_active ?? true,
    basic_requirements: input.basic_requirements || [],
    software_requirements: input.software_requirements || [],
    packages: (input.packages || []).map(pkg => ({
      name: pkg.name?.trim(),
      first_year_price: Number(pkg.first_year_price) || 0,
      second_year_price: Number(pkg.second_year_price) || 0,
      monthly_price: Number(pkg.monthly_price) || 0,
      features: pkg.features || []
    }))
  })

  return mapProduct(payload.data ?? payload)
}

export async function updateProduct(id, patch) {
  try {
    const payload = await api.put(`/products/${encodeURIComponent(id)}`, patch)
    return mapProduct(payload.data ?? payload)
  } catch (error) {
    if (error.status === 404) {
      throw new NotFoundError(`Product ${id} was not found.`)
    }
    throw error
  }
}

export async function updateProductStatus(id, isActive) {
  try {
    const payload = await api.patch(`/products/${encodeURIComponent(id)}/status`, {
      is_active: isActive
    })
    return mapProduct(payload.data ?? payload)
  } catch (error) {
    if (error.status === 404) {
      throw new NotFoundError(`Product ${id} was not found.`)
    }
    throw error
  }
}
