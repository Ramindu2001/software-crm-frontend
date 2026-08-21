import { api } from '@/lib/apiClient'
import { pageResult, unwrap } from '@/lib/apiEnvelope'

/**
 * Quotations — the commercial document.
 *
 *   GET   /api/quotations               quotations:view       list
 *   GET   /api/quotations/:id           quotations:view       the full document
 *   POST  /api/quotations               quotations:create     generate
 *   PUT   /api/quotations/:id           quotations:create     edit while Pending
 *   PATCH /api/quotations/:id/status    quotations:setStatus  approve / reject
 *   POST  /api/quotations/:id/customer  quotations:create     put a prospect on file
 *
 * ── Snapshot ──
 * Line items carry a COPY of the product name, package name and all three fees
 * taken when the quotation was created, plus the package's features and the
 * product's requirements. A quotation sent in July still reads the same in
 * December even if the product was repriced or renamed. Nothing here joins to
 * live product data — and as of the flexible-quotation work the customer block
 * is snapshotted the same way, so correcting a customer's address no longer
 * rewrites every document ever sent to them.
 *
 * The company letterhead is the deliberate exception — it arrives on the
 * detail response read live, so a new address or logo applies to every
 * quotation at once.
 *
 * ── Two kinds of line, two kinds of customer ──
 * A quotation may be addressed to a customer on file OR to a prospect who is
 * not (`isProspect`), and a line may come from the catalogue OR describe
 * bespoke work that is not in it (`isCustom`). Both distinctions are carried by
 * the absence of an id rather than by a mode flag, which is how a payload
 * written before either existed still means what it always meant.
 *
 * ── Pricing ──
 * For a catalogue line every amount is computed server-side and never read from
 * the request: we send the package, the plan and a quantity, and the plan
 * chooses which fee prices it (Annual → first-year fee, Monthly → monthly
 * price). A custom line has no catalogue entry to price from, so its unit price
 * is sent — the server still does all the arithmetic and bounds every figure,
 * but that one number originates here.
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
    // Null when the quotation was raised for someone not on file. The name
    // beside it comes from the document's own snapshot either way, so a
    // prospect quotation still reads correctly everywhere.
    customerId: raw.customer?.id ?? null,
    customerName: raw.customer?.company_name ?? 'Unknown',
    contactPerson: raw.customer?.contact_person ?? '',
    /** Addressed to somebody outside the customer directory. */
    isProspect: Boolean(raw.is_prospect),
    preparedBy: raw.prepared_by ?? '',
    totalAmount: num(raw.total_amount),
    /**
     * The one-off half of the total, charged once per line.
     *
     * Carried so the document can show the split its own "Total" row already
     * includes — without it the line rows visibly failed to add up to the total
     * printed beneath them whenever a package had a setup fee.
     */
    installationTotal: num(raw.installation_total),
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
  const isCustom = Boolean(raw.is_custom)

  return {
    id: raw.id,
    productId: raw.product_id,
    productName: raw.product_name,
    /** Bespoke work with no catalogue entry behind it. */
    isCustom,
    // Where a custom line explains itself. Empty on catalogue lines, which
    // borrow their meaning from a product record the reader can look up.
    description: raw.description ?? '',
    packageId: raw.package_id,
    packageName: raw.package_name,
    plan: raw.plan,
    quantity: Number(raw.quantity ?? 1),
    unitPrice: num(raw.unit_price),
    totalPrice: num(raw.total_price),
    installationFee: num(raw.installation_fee),
    /**
     * All three travel with a catalogue line so the document can show the
     * renewal and monthly figures beside the plan that was chosen.
     *
     * Null on a custom line rather than 0. There is a real difference between
     * "renews at nothing" and "there is nothing to renew", and the document
     * has to be able to tell them apart — a bespoke build is delivered once.
     */
    firstYearFee: isCustom ? null : num(raw.first_year_fee),
    renewalFee: isCustom ? null : num(raw.renewal_fee),
    monthlyPrice: isCustom ? null : num(raw.monthly_price),
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

/** Blank-safe number: '' means "not given", not zero. */
const optionalNumber = (value) =>
  value === '' || value === undefined || value === null ? undefined : Number(value)

/**
 * One line item, in whichever of the two shapes it is.
 *
 * The discriminator on the wire is the presence of `product_id` — the server
 * reads a line without one as custom. `kind` is the builder's own field and is
 * deliberately not sent: it exists to drive the form, and duplicating it into
 * the payload would create a second source of truth that could disagree with
 * the ids beside it.
 */
function toItemBody(item) {
  if (item.kind === 'custom') {
    return {
      product_name: item.productName?.trim(),
      description: item.description?.trim() || undefined,
      // Free text on a custom line — a label like "Phase 1", not a package id.
      package_name: item.packageName?.trim() || undefined,
      plan: item.plan || undefined,
      quantity: Number(item.quantity) || 1,
      // Required, not optional: there is no package fee to fall back to, and a
      // default of zero would quote bespoke work for nothing.
      unit_price: Number(item.unitPrice) || 0,
      installation_fee: optionalNumber(item.installationFee),
      features: (item.features ?? []).map((f) => f.trim()).filter(Boolean),
    }
  }

  return {
    product_id: Number(item.productId),
    package_id: Number(item.packageId),
    plan: item.plan,
    quantity: Number(item.quantity) || 1,
    // Omitted when blank so the server prices the line from the package.
    // Sending '' would be a validation failure rather than "use the default".
    unit_price: optionalNumber(item.unitPrice),
  }
}

/**
 * Build the request body POST and PUT share.
 *
 * The customer half is either an id or an inline block, never both — the API
 * rejects a payload carrying the two, because a customer on file takes their
 * details from their own record and a second version of them on the request
 * would be a silent contradiction.
 */
function toRequestBody(input) {
  const isProspect = input.customerMode === 'new'

  return {
    ...(isProspect
      ? {
          customer: {
            company_name: input.newCustomer?.companyName?.trim(),
            contact_person: input.newCustomer?.contactPerson?.trim() || undefined,
            email: input.newCustomer?.email?.trim() || undefined,
            phone: input.newCustomer?.phone?.trim() || undefined,
            address: input.newCustomer?.address?.trim() || undefined,
          },
        }
      : { customer_id: Number(input.customerId) }),
    discount_percent: Number(input.discountPercent) || 0,
    payment_terms: input.paymentTerms?.trim() || undefined,
    terms_conditions: input.termsConditions?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    items: (input.items ?? []).map(toItemBody),
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
 * Put a prospect on file, and link this quotation to them.
 * Requires quotations:create.
 *
 * With no argument the customer is created from the quotation's own snapshot,
 * which is the usual case — the details were typed once when the quotation was
 * raised. Pass `customerId` instead to link somebody already in the directory,
 * or the individual fields to correct them on the way through.
 *
 * This is the step between an offer and a contract: a quotation may be
 * addressed to anyone, but an agreement needs a counterparty on file, so a won
 * prospect quotation passes through here first.
 *
 * @throws {NotFoundError|NotEditableError} 409 when already linked, or when the
 *   email belongs to an existing customer — the message names who.
 */
export async function linkQuotationCustomer(id, input = {}) {
  try {
    const payload = await api.post(
      `/quotations/${encodeURIComponent(id)}/customer`,
      input.customerId
        ? { customer_id: Number(input.customerId) }
        : {
            company_name: input.companyName?.trim() || undefined,
            contact_person: input.contactPerson?.trim() || undefined,
            email: input.email?.trim() || undefined,
            phone: input.phone?.trim() || undefined,
            address: input.address?.trim() || undefined,
          },
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
