import { matchesQuery, paginate, sortRows } from '@/lib/apiEnvelope'
import { MOCK_QUOTATIONS } from './mockQuotations'
import { MOCK_CUSTOMERS } from '../../customers/api/mockCustomers'
import { MOCK_PRODUCTS } from '../../products/api/mockProducts'
import { getCompanySettings } from '../../company/api'

/**
 * Mock quotations API.
 *
 * Mirrors quotations.http.js, including the behaviour that defines the
 * feature: creating a quotation SNAPSHOTS the product name, package name, all
 * three fees, the package's features and the product's requirements. Editing
 * the mock product afterwards leaves stored quotations untouched, exactly as
 * the real API behaves.
 *
 * A mock that joined to live product data would let the UI be built against a
 * document that rewrites itself, and the bug would only appear in production.
 *
 * No top-level function calls — the bundler can tree-shake this module when
 * the HTTP implementation is selected.
 */

const LATENCY_MS = 340

const delay = (ms = LATENCY_MS) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

export class NotEditableError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotEditableError'
    this.status = 409
  }
}

let store = null

function getStore() {
  store ??= MOCK_QUOTATIONS.map((quotation) => structuredClone(quotation))
  return store
}

const customerById = (id) => MOCK_CUSTOMERS.find((entry) => entry.id === Number(id))
const productById = (id) => MOCK_PRODUCTS.find((entry) => entry.id === Number(id))

/** "260815-075" — YYMMDD of issue, then the row id as the sequence. */
function formatReference(createdAt, id) {
  const stamp = new Date(createdAt)
  const yy = String(stamp.getFullYear()).slice(2)
  const mm = String(stamp.getMonth() + 1).padStart(2, '0')
  const dd = String(stamp.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}-${String(id).padStart(3, '0')}`
}

/**
 * The customer block a stored quotation renders from.
 *
 * Mirrors the server: the details are snapshotted onto the quotation when it is
 * raised, so a document never rewrites itself when a customer's record changes.
 * Seeded fixtures predate the snapshot and carry only a `customerId`, so they
 * fall back to the directory — which is exactly what migration 006 does to
 * backfill the real table.
 */
function customerSnapshot(quotation) {
  if (quotation.customerName !== undefined) {
    return {
      id: quotation.customerId ?? null,
      name: quotation.customerName,
      contactPerson: quotation.customerContactPerson ?? '',
      email: quotation.customerEmail ?? '',
      phone: quotation.customerPhone ?? '',
      address: quotation.customerAddress ?? '',
    }
  }

  const customer = customerById(quotation.customerId)
  return {
    id: customer?.id ?? null,
    name: customer?.company_name ?? 'Unknown',
    contactPerson: customer?.contact_person ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ?? '',
    address: customer?.address ?? '',
  }
}

function mapListItem(quotation) {
  const customer = customerSnapshot(quotation)
  return {
    id: formatReference(quotation.createdAt, quotation.id),
    quotationId: quotation.id,
    customerId: customer.id,
    customerName: customer.name,
    contactPerson: customer.contactPerson,
    // Raised for somebody who is not in the customer directory.
    isProspect: customer.id === null,
    preparedBy: quotation.preparedByName ?? '',
    totalAmount: quotation.totalAmount,
    installationTotal: quotation.installationTotal ?? 0,
    discount: quotation.discount,
    discountPercent: quotation.discountPercent ?? 0,
    finalAmount: quotation.finalAmount,
    status: quotation.status,
    validUntil: quotation.validUntil ?? null,
    itemsCount: quotation.items.length,
    createdAt: quotation.createdAt,
  }
}

async function mapDetail(quotation) {
  const company = await getCompanySettings()

  return {
    ...mapListItem(quotation),
    customer: customerSnapshot(quotation),
    // Live, matching the API — the letterhead is never snapshotted.
    company: {
      companyName: company.companyName,
      address: company.address,
      phone: company.phone,
      email: company.email,
      website: company.website,
      logoPath: company.logoPath,
    },
    paymentTerms: quotation.paymentTerms ?? '',
    termsConditions: quotation.termsConditions ?? '',
    notes: quotation.notes ?? '',
    items: quotation.items.map((item) => structuredClone(item)),
  }
}

/**
 * Resolve a package and build the snapshot line, mirroring priceItems() on the
 * server — including rejecting a package that belongs to a different product,
 * which is what stops one product's name being paired with another's pricing.
 */
function buildLine(rawItem, index) {
  const at = `items[${index}]`

  /**
   * A custom line describes work the catalogue has no entry for, so there is
   * nothing to resolve and nothing to copy — everything it renders arrives on
   * the request. Mirrors the server, where the absent product id is the whole
   * discriminator.
   */
  if (rawItem.kind === 'custom') {
    const name = rawItem.productName?.trim()
    if (!name) throw validationError([`${at}: product_name is required`])

    const unitPrice = Number(rawItem.unitPrice)
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw validationError([`${at}: unit_price is required`])
    }

    const quantity = Number(rawItem.quantity) || 1

    return {
      id: Math.floor(Math.random() * 1e9),
      productId: null,
      productName: name,
      isCustom: true,
      description: rawItem.description?.trim() ?? '',
      packageId: null,
      packageName: rawItem.packageName?.trim() || null,
      plan: rawItem.plan || 'Annual',
      quantity,
      unitPrice,
      totalPrice: Number((unitPrice * quantity).toFixed(2)),
      installationFee: Number(rawItem.installationFee) || 0,
      // Null, not zero: "there is nothing to renew" is a different statement
      // from "it renews at nothing", and the document distinguishes them.
      firstYearFee: null,
      renewalFee: null,
      monthlyPrice: null,
      features: (rawItem.features ?? []).map((f) => f.trim()).filter(Boolean),
      // Requirements describe what a product needs; bespoke work states its
      // scope in `description` instead.
      basicRequirements: [],
      softwareRequirements: [],
    }
  }

  const product = productById(rawItem.productId)
  if (!product) throw validationError([`${at}: product_id ${rawItem.productId} does not exist`])

  const pkg = product.packages.find((entry) => entry.id === Number(rawItem.packageId))
  if (!pkg) {
    throw validationError([
      `${at}: package_id ${rawItem.packageId} does not belong to product ${rawItem.productId}`,
    ])
  }

  const quantity = Number(rawItem.quantity) || 1
  const listPrice = rawItem.plan === 'Annual' ? pkg.first_year_price : pkg.monthly_price
  const unitPrice =
    rawItem.unitPrice === '' || rawItem.unitPrice === undefined || rawItem.unitPrice === null
      ? Number(listPrice)
      : Number(rawItem.unitPrice)

  return {
    id: Math.floor(Math.random() * 1e9),
    productId: product.id,
    productName: product.name,
    isCustom: false,
    description: '',
    packageId: pkg.id,
    packageName: pkg.name,
    plan: rawItem.plan,
    quantity,
    unitPrice,
    totalPrice: Number((unitPrice * quantity).toFixed(2)),
    installationFee: Number(pkg.installation_fee ?? 0),
    firstYearFee: Number(pkg.first_year_price),
    renewalFee: Number(pkg.second_year_price),
    monthlyPrice: Number(pkg.monthly_price),
    // The snapshot: copied now, never re-read.
    features: [...(pkg.features ?? [])],
    basicRequirements: [...(product.basic_requirements ?? [])],
    softwareRequirements: [...(product.software_requirements ?? [])],
  }
}

function validationError(messages) {
  const error = new Error('Validation failed')
  error.status = 422
  error.messages = messages
  return error
}

function priceQuotation(input) {
  const items = (input.items ?? []).map(buildLine)

  const serviceTotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
  /**
   * Charged once per line regardless of quantity — a one-time site
   * installation, not a per-licence cost.
   *
   * This used to be omitted from the mock's totals altogether, which quietly
   * made every mock quotation cheaper than the same payload against the real
   * API. Included now so the two agree, which is the only reason this file
   * exists.
   */
  const installationTotal = items.reduce((sum, item) => sum + (item.installationFee ?? 0), 0)

  const totalAmount = Number((serviceTotal + installationTotal).toFixed(2))
  const discountPercent = Number(input.discountPercent) || 0
  const discount = Number(((totalAmount * discountPercent) / 100).toFixed(2))

  return {
    items,
    totalAmount,
    installationTotal: Number(installationTotal.toFixed(2)),
    discountPercent,
    discount,
    finalAmount: Number((totalAmount - discount).toFixed(2)),
  }
}

const SORT_ACCESSORS = {
  id: (quotation) => quotation.quotationId,
  reference: (quotation) => quotation.id,
  createdAt: (quotation) => new Date(quotation.createdAt).getTime(),
  totalAmount: (quotation) => quotation.totalAmount,
  finalAmount: (quotation) => quotation.finalAmount,
  discount: (quotation) => quotation.discount,
  status: (quotation) => quotation.status,
}

/** The API searches company name, contact person and the reference. */
const SEARCH_FIELDS = ['customerName', 'contactPerson', 'id']

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

  const rows = getStore()
    .map(mapListItem)
    .filter((quotation) => {
      if (status && quotation.status !== status) return false
      if (customerId && String(quotation.customerId) !== String(customerId)) return false
      return matchesQuery(quotation, query, SEARCH_FIELDS)
    })

  const accessor = SORT_ACCESSORS[sortBy] ?? SORT_ACCESSORS.createdAt

  return paginate(sortRows(rows, accessor, sortDir), { page, perPage })
}

function findQuotation(id) {
  return getStore().find(
    (quotation) =>
      String(quotation.id) === String(id) ||
      formatReference(quotation.createdAt, quotation.id) === String(id),
  )
}

export async function getQuotation(id) {
  await delay(240)

  const quotation = findQuotation(id)
  if (!quotation) throw new NotFoundError(`Quotation ${id} was not found.`)

  return mapDetail(quotation)
}

/**
 * Resolve the customer block to store, from either mode.
 *
 * A customer on file is authoritative — their record supplies the snapshot, so
 * the directory and the document cannot disagree. A prospect supplies their own
 * details and gets no `customerId` at all.
 */
function resolveCustomerFields(input) {
  if (input.customerMode === 'new') {
    const name = input.newCustomer?.companyName?.trim()
    if (!name) throw validationError(['customer.company_name is required'])

    return {
      customerId: null,
      customerName: name,
      customerContactPerson: input.newCustomer?.contactPerson?.trim() ?? '',
      customerEmail: input.newCustomer?.email?.trim() ?? '',
      customerPhone: input.newCustomer?.phone?.trim() ?? '',
      customerAddress: input.newCustomer?.address?.trim() ?? '',
    }
  }

  const customer = customerById(input.customerId)
  if (!customer) {
    throw validationError([`customer_id ${input.customerId} does not exist`])
  }

  return {
    customerId: customer.id,
    customerName: customer.company_name,
    customerContactPerson: customer.contact_person ?? '',
    customerEmail: customer.email ?? '',
    customerPhone: customer.phone ?? '',
    customerAddress: customer.address ?? '',
  }
}

export async function createQuotation(input) {
  await delay(460)

  const customerFields = resolveCustomerFields(input)
  const priced = priceQuotation(input)
  const company = await getCompanySettings()
  const createdAt = new Date()

  const validUntil = new Date(createdAt)
  validUntil.setDate(validUntil.getDate() + (company.quotationValidityDays || 3))

  const quotation = {
    id: getStore().reduce((max, entry) => Math.max(max, entry.id), 0) + 1,
    ...customerFields,
    // The real API takes this from the bearer token; the mock reads the
    // session the auth mock wrote, which is the same fact by another route.
    preparedByName: currentUserName(),
    ...priced,
    status: 'Pending',
    paymentTerms: input.paymentTerms?.trim() || company.paymentTerms,
    termsConditions: input.termsConditions?.trim() || company.termsConditions,
    notes: input.notes?.trim() ?? '',
    validUntil: validUntil.toISOString().slice(0, 10),
    createdAt: createdAt.toISOString(),
  }

  store = [...getStore(), quotation]
  return mapDetail(quotation)
}

export async function updateQuotation(id, input) {
  await delay(420)

  const existing = findQuotation(id)
  if (!existing) throw new NotFoundError(`Quotation ${id} was not found.`)

  if (existing.status !== 'Pending') {
    throw new NotEditableError(
      `Quotation ${formatReference(existing.createdAt, existing.id)} is ${existing.status} ` +
        'and can no longer be edited. Create a new quotation instead.',
    )
  }

  const customerFields = resolveCustomerFields(input)
  const priced = priceQuotation(input)
  const updated = {
    ...existing,
    ...customerFields,
    ...priced,
    paymentTerms: input.paymentTerms?.trim() ?? '',
    termsConditions: input.termsConditions?.trim() ?? '',
    notes: input.notes?.trim() ?? '',
  }

  store = getStore().map((quotation) =>
    quotation.id === existing.id ? updated : quotation,
  )
  return mapDetail(updated)
}

/**
 * Put a prospect on file and link the quotation to them.
 *
 * The mock cannot write to the customers fixture (it is a module constant that
 * other features read), so a linked id is synthesised while the snapshot the
 * document renders from is left exactly as it was — which is the behaviour that
 * matters here, and the same rule the server follows: linking fills in the
 * pointer, it never rewrites what the document said.
 */
export async function linkQuotationCustomer(id, input = {}) {
  await delay(320)

  const existing = findQuotation(id)
  if (!existing) throw new NotFoundError(`Quotation ${id} was not found.`)

  const snapshot = customerSnapshot(existing)
  if (snapshot.id !== null) {
    throw new NotEditableError(
      `Quotation ${formatReference(existing.createdAt, existing.id)} is already ` +
        `linked to customer ${snapshot.id}.`,
    )
  }

  if (!input.customerId && !(input.email ?? snapshot.email)) {
    throw validationError(['email is required'])
  }

  const linkedId = input.customerId
    ? Number(input.customerId)
    : MOCK_CUSTOMERS.reduce((max, entry) => Math.max(max, entry.id), 0) + 1

  const updated = { ...existing, customerId: linkedId }
  store = getStore().map((quotation) =>
    quotation.id === existing.id ? updated : quotation,
  )

  return mapDetail(updated)
}

export async function updateQuotationStatus(id, status) {
  await delay(260)

  const existing = findQuotation(id)
  if (!existing) throw new NotFoundError(`Quotation ${id} was not found.`)

  const updated = { ...existing, status }
  store = getStore().map((quotation) =>
    quotation.id === existing.id ? updated : quotation,
  )

  return { id: formatReference(updated.createdAt, updated.id), status }
}

function currentUserName() {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const raw = storage.getItem('synnex:session')
      if (raw) return JSON.parse(raw)?.user?.name ?? 'Unknown'
    } catch {
      // Storage unavailable or corrupt — try the next one.
    }
  }
  return 'Unknown'
}
