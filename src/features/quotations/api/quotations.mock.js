import { MOCK_QUOTATIONS } from './mockQuotations'
import { MOCK_CUSTOMERS } from '../../customers/api/mockCustomers'

/**
 * Mock quotations API standing in for the Laravel backend.
 */

const LATENCY_MS = 350

const delay = (ms = LATENCY_MS) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

// Mutable store
let store = null

function getStore() {
  store ??= [...MOCK_QUOTATIONS]
  return store
}

function populateCustomer(quotation) {
  const customer = MOCK_CUSTOMERS.find((c) => c.id === quotation.customerId)
  return {
    ...quotation,
    customerName: customer ? customer.name : 'Unknown Customer',
  }
}

const SORT_ACCESSORS = {
  id: (q) => q.id,
  customerName: (q) => populateCustomer(q).customerName.toLowerCase(),
  status: (q) => q.status,
  totalAmount: (q) => q.totalAmount,
  date: (q) => new Date(q.date).getTime(),
  updatedAt: (q) => new Date(q.updatedAt).getTime(),
}

function matchesQuery(quotation, query) {
  if (!query) return true
  const q = populateCustomer(quotation)
  return q.customerName.toLowerCase().includes(query)
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
} = {}) {
  await delay()

  const normalizedQuery = query.trim().toLowerCase()

  const filtered = getStore().filter((quotation) => {
    if (status && quotation.status !== status) return false
    return matchesQuery(quotation, normalizedQuery)
  })

  const accessor = SORT_ACCESSORS[sortBy] ?? SORT_ACCESSORS.updatedAt
  const direction = sortDir === 'asc' ? 1 : -1

  const sorted = [...filtered].sort((a, b) => {
    const left = accessor(a)
    const right = accessor(b)
    if (left < right) return -direction
    if (left > right) return direction
    return 0
  })

  const filteredTotal = sorted.length
  const lastPage = Math.max(1, Math.ceil(filteredTotal / perPage))
  const safePage = Math.max(1, Math.min(page, lastPage))
  const start = (safePage - 1) * perPage
  const data = sorted.slice(start, start + perPage).map(populateCustomer)

  return {
    data,
    total: getStore().length,
    filteredTotal,
    currentPage: safePage,
    lastPage,
    perPage,
  }
}

/**
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export async function getQuotation(id) {
  await delay(200)

  const numericId = Number(id)
  const quotation = getStore().find((q) => q.id === numericId)
  if (!quotation) throw new NotFoundError(`Quotation ${id} was not found.`)

  return populateCustomer({ ...quotation })
}

/**
 * @param {object} input
 * @returns {Promise<object>}
 */
export async function createQuotation(input) {
  await delay(400)

  const now = new Date().toISOString()
  const nextId = getStore().reduce((max, q) => Math.max(max, q.id), 0) + 1

  const items = (input.items || []).map((item, index) => {
    const quantity = Number(item.quantity) || 0
    const unitPrice = Number(item.unitPrice) || 0
    return {
      id: `${nextId}-${index + 1}`,
      productName: item.productName.trim(),
      quantity,
      unitPrice,
      amount: quantity * unitPrice,
    }
  })

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)

  const quotation = {
    id: nextId,
    customerId: Number(input.customerId),
    status: 'pending',
    date: input.date || now,
    items,
    totalAmount,
    createdAt: now,
    updatedAt: now,
  }

  store = [quotation, ...getStore()]
  return populateCustomer({ ...quotation })
}

/**
 * @param {number|string} id
 * @param {object} patch
 * @returns {Promise<object>}
 */
export async function updateQuotation(id, patch) {
  await delay(250)

  const numericId = Number(id)
  const index = getStore().findIndex((q) => q.id === numericId)
  if (index === -1) throw new NotFoundError(`Quotation ${id} was not found.`)

  const updated = {
    ...getStore()[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  }

  store = getStore().map((q, i) => (i === index ? updated : q))
  return populateCustomer({ ...updated })
}
