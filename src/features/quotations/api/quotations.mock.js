import { matchesQuery, paginate, sortRows } from '@/lib/apiEnvelope'
import { MOCK_QUOTATIONS } from './mockQuotations'
import { MOCK_CUSTOMERS } from '../../customers/api/mockCustomers'

/**
 * Mock quotations API.
 *
 * Matches quotations.http.js, including the two places the API returns less
 * than you might expect: `createQuotation` answers with the reference and
 * totals only, and there is no `getQuotation` at all, because no endpoint can
 * read a quotation's line items back.
 *
 * Totals are computed here rather than taken from the input, mirroring the
 * server — a client that could set its own total could quote any price.
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

let store = null

function getStore() {
  store ??= [...MOCK_QUOTATIONS]
  return store
}

const customerName = (customerId) =>
  MOCK_CUSTOMERS.find((customer) => customer.id === customerId)?.company_name ??
  'Unknown'

/**
 * Derive the QT-YYYY-NNN reference the way the backend does: the count of
 * quotations from the same year with an id at or below this one.
 */
function toReference(quotation, all) {
  const year = new Date(quotation.createdAt).getUTCFullYear()
  const sequence = all.filter(
    (entry) =>
      new Date(entry.createdAt).getUTCFullYear() === year &&
      entry.id <= quotation.id,
  ).length

  return `QT-${year}-${String(sequence).padStart(3, '0')}`
}

function mapQuotation(quotation, all) {
  return {
    id: toReference(quotation, all),
    quotationId: quotation.id,
    customerId: quotation.customerId,
    customerName: customerName(quotation.customerId),
    totalAmount: quotation.totalAmount,
    discount: quotation.discount,
    finalAmount: quotation.finalAmount,
    status: quotation.status,
    itemsCount: quotation.itemsCount,
    createdAt: quotation.createdAt,
  }
}

const SORT_ACCESSORS = {
  id: (quotation) => quotation.quotationId,
  createdAt: (quotation) => new Date(quotation.createdAt).getTime(),
  totalAmount: (quotation) => quotation.totalAmount,
  finalAmount: (quotation) => quotation.finalAmount,
  discount: (quotation) => quotation.discount,
  status: (quotation) => quotation.status,
}

/** The API searches the customer's company name and contact person. */
const SEARCH_FIELDS = ['customerName']

export async function listQuotations({
  query = '',
  status = '',
  customerId = '',
  sortBy = 'createdAt',
  sortDir = 'desc',
  page = 1,
  perPage = 10,
} = {}) {
  await delay()

  const all = getStore()

  const rows = all
    .map((quotation) => mapQuotation(quotation, all))
    .filter((quotation) => {
      if (status && quotation.status !== status) return false
      if (customerId && String(quotation.customerId) !== String(customerId)) {
        return false
      }
      return matchesQuery(quotation, query, SEARCH_FIELDS)
    })

  const accessor = SORT_ACCESSORS[sortBy] ?? SORT_ACCESSORS.createdAt

  return paginate(sortRows(rows, accessor, sortDir), { page, perPage })
}

/**
 * Returns the reference and totals only, matching the API's 201 body.
 *
 * @returns {Promise<{id: string, totalAmount: number, finalAmount: number}>}
 */
export async function createQuotation(input) {
  await delay(400)

  const totalAmount = (input.items ?? []).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  )
  const discount = Number(input.discount) || 0
  const finalAmount = totalAmount - discount

  const quotation = {
    id: getStore().reduce((max, entry) => Math.max(max, entry.id), 0) + 1,
    customerId: Number(input.customerId),
    totalAmount,
    discount,
    finalAmount,
    // The API always creates as Pending; status is not an input.
    status: 'Pending',
    itemsCount: (input.items ?? []).length,
    createdAt: new Date().toISOString(),
  }

  store = [...getStore(), quotation]

  return {
    id: toReference(quotation, getStore()),
    totalAmount,
    finalAmount,
  }
}

/**
 * @param {number|string} id Numeric key or "QT-2026-001".
 * @returns {Promise<{id: string, status: string}>}
 * @throws {NotFoundError}
 */
export async function updateQuotationStatus(id, status) {
  await delay(250)

  const all = getStore()
  const index = all.findIndex(
    (quotation) =>
      String(quotation.id) === String(id) ||
      toReference(quotation, all) === String(id).toUpperCase(),
  )
  if (index === -1) throw new NotFoundError(`Quotation ${id} was not found.`)

  const updated = { ...all[index], status }
  store = all.map((quotation, position) =>
    position === index ? updated : quotation,
  )

  return { id: toReference(updated, getStore()), status }
}
