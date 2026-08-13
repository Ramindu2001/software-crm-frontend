import { api } from '@/lib/apiClient'

/**
 * Real quotations endpoints.
 */

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

const SORT_COLUMNS = {
  id: 'id',
  customerName: 'customer_name',
  status: 'status',
  totalAmount: 'total_amount',
  date: 'date',
  updatedAt: 'updated_at',
  createdAt: 'created_at',
}

function mapQuotation(raw) {
  return {
    id: raw.quotation_id ?? raw.id,
    customerId: raw.customer_id,
    customerName: raw.customer?.name ?? raw.customer_name ?? 'Unknown Customer',
    status: raw.status ?? 'pending',
    date: raw.date,
    items: (raw.items || []).map((item) => ({
      id: item.id,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      amount: item.amount,
    })),
    totalAmount: raw.total_amount ?? 0,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

/**
 * @param {object} [params]
 * @returns {Promise<{data: Array, total: number, filteredTotal: number, currentPage: number, lastPage: number, perPage: number}>}
 */
export async function listQuotations({
  query = '',
  status = '',
  sortBy = 'updatedAt',
  sortDir = 'desc',
  page = 1,
  perPage = 10,
  signal,
} = {}) {
  const payload = await api.get('/quotations', {
    params: {
      search: query,
      status,
      sort: `${SORT_COLUMNS[sortBy] ?? SORT_COLUMNS.updatedAt}:${sortDir}`,
      page,
      per_page: perPage,
    },
    signal,
  })

  const records = payload.data ?? []
  const data = records.map(mapQuotation)

  const filteredTotal = payload.meta?.total ?? data.length
  const total = payload.meta?.unfiltered_total ?? filteredTotal
  const currentPage = payload.meta?.current_page ?? page
  const lastPage = payload.meta?.last_page ?? 1
  const resolvedPerPage = payload.meta?.per_page ?? perPage

  return { data, total, filteredTotal, currentPage, lastPage, perPage: resolvedPerPage }
}

/**
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export async function getQuotation(id) {
  try {
    const payload = await api.get(`/quotations/${encodeURIComponent(id)}`)
    return mapQuotation(payload.data ?? payload)
  } catch (error) {
    if (error.status === 404) {
      throw new NotFoundError(`Quotation ${id} was not found.`)
    }
    throw error
  }
}

/**
 * @param {object} input
 * @returns {Promise<object>}
 */
export async function createQuotation(input) {
  const payload = await api.post('/quotations', {
    customer_id: input.customerId,
    date: input.date,
    items: (input.items || []).map((item) => ({
      product_id: item.productId,
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
    })),
  })

  return mapQuotation(payload.data ?? payload)
}

/**
 * @param {number|string} id
 * @param {object} patch
 * @returns {Promise<object>}
 */
export async function updateQuotation(id, patch) {
  try {
    const payload = await api.patch(
      `/quotations/${encodeURIComponent(id)}`,
      patch,
    )
    return mapQuotation(payload.data ?? payload)
  } catch (error) {
    if (error.status === 404) {
      throw new NotFoundError(`Quotation ${id} was not found.`)
    }
    throw error
  }
}
