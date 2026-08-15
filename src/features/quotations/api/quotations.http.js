import { api } from '@/lib/apiClient'
import { pageResult, unwrap } from '@/lib/apiEnvelope'

/**
 * Quotations — the commercial document.
 *
 *   GET   /api/quotations             quotations:view       list
 *   GET   /api/quotations/:id         quotations:view       the full document
 *   POST  /api/quotations             quotations:create     generate
 *   PUT   /api/quotations/:id         quotations:create     edit while Pending
 *   PATCH /api/quotations/:id/status  quotations:setStatus  approve / reject
 *
 * ── Snapshot ──
 * Line items carry a COPY of the product name, package name and all three fees
 * taken when the quotation was created, plus the package's features and the
 * product's requirements. A quotation sent in July still reads the same in
 * December even if the product was repriced or renamed. Nothing here joins to
 * live product data.
 *
 * The company letterhead is the deliberate exception — it arrives on the
 * detail response read live, so a new address or logo applies to every
 * quotation at once.
 *
 * ── Pricing ──
 * Every amount is computed server-side and never read from the request. What
 * we send is the package, the plan and a quantity; the plan chooses which fee
 * prices the line (Annual → first-year fee, Monthly → monthly price).
 */

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

/**
 * Thrown when a quotation can no longer be edited because it has been approved
 * or rejected. Its own type so the UI can explain rather than show a generic
 * failure — the answer is "create a new quotation", not "try again".
 */
export class NotEditableError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotEditableError'
    this.status = 409
  }
}

/** UI sort keys mapped to the columns the API will order by. */
const SORT_COLUMNS = {
  id: 'id',
  reference: 'reference',
  createdAt: 'created_at',
  totalAmount: 'total_amount',
  finalAmount: 'final_amount',
  discount: 'discount',
  status: 'status',
}

const DEFAULT_SORT_KEY = 'createdAt'

const num = (value) => Number(value ?? 0)

function mapListItem(raw) {
  return {
    // The printed reference, e.g. "260815-075".
    id: raw.id,
    quotationId: raw.quotation_id,
    customerId: raw.customer?.id ?? null,
    customerName: raw.customer?.company_name ?? 'Unknown',
    contactPerson: raw.customer?.contact_person ?? '',
    preparedBy: raw.prepared_by ?? '',
    totalAmount: num(raw.total_amount),
    discount: num(raw.discount),
    discountPercent: num(raw.discount_percent),
    finalAmount: num(raw.final_amount),
    status: raw.status,
    validUntil: raw.valid_until ?? null,
    itemsCount: Number(raw.items_count ?? 0),
    createdAt: raw.created_at,
  }
}

function mapItem(raw) {
  return {
    id: raw.id,
    productId: raw.product_id,
    productName: raw.product_name,
    packageId: raw.package_id,
    packageName: raw.package_name,
    plan: raw.plan,
    quantity: Number(raw.quantity ?? 1),
    unitPrice: num(raw.unit_price),
    totalPrice: num(raw.total_price),
    // All three travel with the line so the document can show the renewal and
    // monthly figures beside the plan that was chosen.
    firstYearFee: num(raw.first_year_fee),
    renewalFee: num(raw.renewal_fee),
    monthlyPrice: num(raw.monthly_price),
    features: raw.features ?? [],
    basicRequirements: raw.basic_requirements ?? [],
    softwareRequirements: raw.software_requirements ?? [],
  }
}

function mapDetail(raw) {
  return {
    ...mapListItem(raw),
    customer: {
      id: raw.customer?.id ?? null,
      name: raw.customer?.company_name ?? 'Unknown',
      contactPerson: raw.customer?.contact_person ?? '',
      email: raw.customer?.email ?? '',
      phone: raw.customer?.phone ?? '',
      address: raw.customer?.address ?? '',
    },
    company: {
      companyName: raw.company?.company_name ?? '',
      address: raw.company?.address ?? '',
      phone: raw.company?.phone ?? '',
      email: raw.company?.email ?? '',
      website: raw.company?.website ?? '',
      logoPath: raw.company?.logo_path ?? '',
    },
    paymentTerms: raw.payment_terms ?? '',
    termsConditions: raw.terms_conditions ?? '',
    notes: raw.notes ?? '',
    items: (raw.items ?? []).map(mapItem),
  }
}

/** Build the request body POST and PUT share. */
function toRequestBody(input) {
  return {
    customer_id: Number(input.customerId),
    discount_percent: Number(input.discountPercent) || 0,
    payment_terms: input.paymentTerms?.trim() || undefined,
    terms_conditions: input.termsConditions?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    items: (input.items ?? []).map((item) => ({
      product_id: Number(item.productId),
      package_id: Number(item.packageId),
      plan: item.plan,
      quantity: Number(item.quantity) || 1,
      // Omitted when blank so the server prices the line from the package.
      // Sending '' would be a validation failure rather than "use the default".
      unit_price:
        item.unitPrice === '' || item.unitPrice === undefined || item.unitPrice === null
          ? undefined
          : Number(item.unitPrice),
    })),
  }
}

function translateError(error) {
  if (error.status === 404) return new NotFoundError(error.message)
  if (error.status === 409) return new NotEditableError(error.message)
  return error
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
      // Matches company name, contact person, or the reference itself.
      search: query,
      status,
      customer_id: customerId,
      sort: `${column}:${sortDir}`,
      page,
      perPage,
    },
    signal,
  })

  return pageResult(payload, mapListItem, { page, perPage })
}

/**
 * The whole document: customer block, snapshot line items, terms, and the live
 * company letterhead. One request renders the printable quotation.
 *
 * @param {number|string} id Numeric id (cheaper) or "260815-075".
 * @throws {NotFoundError}
 */
export async function getQuotation(id, { signal } = {}) {
  try {
    const payload = await api.get(`/quotations/${encodeURIComponent(id)}`, { signal })
    return mapDetail(unwrap(payload))
  } catch (error) {
    throw translateError(error)
  }
}

/**
 * Generate a quotation and its line items in one transaction.
 * Requires quotations:create.
 *
 * Returns the full created document, so the caller can go straight to the
 * preview without a follow-up read.
 */
export async function createQuotation(input) {
  try {
    const payload = await api.post('/quotations', toRequestBody(input))
    return mapDetail(unwrap(payload))
  } catch (error) {
    throw translateError(error)
  }
}

/**
 * Replace a Pending quotation's content. Requires quotations:create.
 *
 * Line items are rewritten, which re-snapshots them from the CURRENT product
 * data — so editing a quotation deliberately refreshes its pricing and
 * features. Approved and Rejected quotations are refused with a
 * NotEditableError.
 *
 * @throws {NotFoundError|NotEditableError}
 */
export async function updateQuotation(id, input) {
  try {
    const payload = await api.put(
      `/quotations/${encodeURIComponent(id)}`,
      toRequestBody(input),
    )
    return mapDetail(unwrap(payload))
  } catch (error) {
    throw translateError(error)
  }
}

/**
 * Approve, reject, or reset. Requires quotations:setStatus.
 * Transitions are unrestricted — the API enforces no workflow.
 *
 * @returns {Promise<{id: string, status: string}>}
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
    throw translateError(error)
  }
}
