import { api } from '@/lib/apiClient'
import { pageResult, unwrap } from '@/lib/apiEnvelope'

/**
 * Real quotation endpoints.
 *
 *   GET   /api/quotations             any logged-in   paginated + filtered
 *   POST  /api/quotations             Admin, Support  create with line items
 *   PATCH /api/quotations/:id/status  Admin, Support  approve / reject / reset
 *
 * There is no GET /:id, so line items cannot be read back once written. The
 * list carries `items_count` and every total, which is what the table shows;
 * a quotation detail view needs that endpoint first.
 *
 * ── Money ──
 * Every amount is computed server-side in integer cents and is NOT accepted
 * from the request: a client that could post its own `total_amount` could
 * quote itself any price. What we send is quantity and unit_price per line,
 * plus an optional discount; what comes back is total_amount, discount and
 * final_amount.
 *
 * ── References ──
 * Each row carries both `id` ("QT-2026-001", for display) and `quotation_id`
 * (the numeric key). The reference is derived rather than stored, so resolving
 * one costs the server an extra lookup — `quotationId` is preferred in the
 * PATCH URL for exactly that reason.
 */

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

/**
 * UI sort keys mapped to the columns the API will order by.
 * `customerName` is absent: it lives on the joined customers table and is not
 * in the backend's allowlist, so asking for it returns 400.
 */
const SORT_COLUMNS = {
  id: 'id',
  createdAt: 'created_at',
  totalAmount: 'total_amount',
  finalAmount: 'final_amount',
  discount: 'discount',
  status: 'status',
}

const DEFAULT_SORT_KEY = 'createdAt'

function mapQuotation(raw) {
  return {
    // The display reference. Derived per year, so it is stable to read but
    // must never be stored client-side as a durable key.
    id: raw.id,
    quotationId: raw.quotation_id,
    customerId: raw.customer?.id ?? null,
    customerName: raw.customer?.company_name ?? 'Unknown',
    totalAmount: Number(raw.total_amount ?? 0),
    discount: Number(raw.discount ?? 0),
    finalAmount: Number(raw.final_amount ?? 0),
    status: raw.status,
    itemsCount: Number(raw.items_count ?? 0),
    createdAt: raw.created_at,
  }
}

/**
 * @param {object} [params]
 * @returns {Promise<{data: Array, total: number, filteredTotal: number,
 *   currentPage: number, lastPage: number, perPage: number}>}
 */
export async function listQuotations({
  query = '',
  status = '',
  customerId = '',
  sortBy = DEFAULT_SORT_KEY,
  sortDir = 'desc',
  page = 1,
  perPage = 10,
  signal,
} = {}) {
  const column = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS[DEFAULT_SORT_KEY]

  const payload = await api.get('/quotations', {
    params: {
      // Matches the customer's company name or contact person.
      search: query,
      status,
      customer_id: customerId,
      sort: `${column}:${sortDir}`,
      page,
      perPage,
    },
    signal,
  })

  return pageResult(payload, mapQuotation, { page, perPage })
}

/**
 * Generate a quotation and its line items in one transaction. Requires the
 * Admin or Support role.
 *
 * The 201 carries only the reference and the two totals — not the whole
 * quotation — so this returns exactly that. Callers refetch the list to see
 * the new row in context rather than splicing in a partial record.
 *
 * @param {{customerId: number|string, discount?: number|string,
 *   items: Array<{productId: number|string, quantity: number|string,
 *   unitPrice: number|string}>}} input
 * @returns {Promise<{id: string, totalAmount: number, finalAmount: number}>}
 */
export async function createQuotation(input) {
  const payload = await api.post('/quotations', {
    customer_id: Number(input.customerId),
    discount: Number(input.discount) || 0,
    items: (input.items ?? []).map((item) => ({
      product_id: Number(item.productId),
      quantity: Number(item.quantity),
      // Client-supplied on purpose, so a negotiated price is possible. It is
      // never derived from the product's package pricing.
      unit_price: Number(item.unitPrice),
    })),
  })

  const data = unwrap(payload) ?? {}

  return {
    id: data.quotation_id,
    totalAmount: Number(data.total_amount ?? 0),
    finalAmount: Number(data.final_amount ?? 0),
  }
}

/**
 * Approve, reject, or reset a quotation. Requires Admin or Support.
 *
 * Transitions are unrestricted — an approved quotation can still be corrected
 * to rejected, because the API enforces no workflow.
 *
 * Approving does NOT generate an invoice; that side effect is not implemented
 * server-side.
 *
 * @param {number|string} id Numeric key (cheaper) or "QT-2026-001".
 * @param {string} status Pending | Approved | Rejected
 * @returns {Promise<{id: string, status: string}>}
 * @throws {NotFoundError}
 */
export async function updateQuotationStatus(id, status) {
  try {
    const payload = await api.patch(
      `/quotations/${encodeURIComponent(id)}/status`,
      { status },
    )
    const data = unwrap(payload) ?? {}
    return { id: data.quotation_id, status: data.status ?? status }
  } catch (error) {
    if (error.status === 404) {
      throw new NotFoundError(`Quotation ${id} was not found.`)
    }
    throw error
  }
}
