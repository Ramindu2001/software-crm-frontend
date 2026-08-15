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

function mapListItem(quotation) {
  const customer = customerById(quotation.customerId)
  return {
    id: formatReference(quotation.createdAt, quotation.id),
    quotationId: quotation.id,
    customerId: quotation.customerId,
    customerName: customer?.company_name ?? 'Unknown',
    contactPerson: customer?.contact_person ?? '',
    preparedBy: quotation.preparedByName ?? '',
    totalAmount: quotation.totalAmount,
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
  const customer = customerById(quotation.customerId)
  const company = await getCompanySettings()

  return {
    ...mapListItem(quotation),
    customer: {
      id: customer?.id ?? null,
      name: customer?.company_name ?? 'Unknown',
      contactPerson: customer?.contact_person ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      address: customer?.address ?? '',
    },
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
    packageId: pkg.id,
    packageName: pkg.name,
    plan: rawItem.plan,
    quantity,
    unitPrice,
    totalPrice: Number((unitPrice * quantity).toFixed(2)),
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
  const totalAmount = Number(
    items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2),
  )
  const discountPercent = Number(input.discountPercent) || 0
  const discount = Number(((totalAmount * discountPercent) / 100).toFixed(2))

  return {
    items,
    totalAmount,
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

export async function createQuotation(input) {
  await delay(460)

  const customer = customerById(input.customerId)
  if (!customer) {
    throw validationError([`customer_id ${input.customerId} does not exist`])
  }

  const priced = priceQuotation(input)
  const company = await getCompanySettings()
  const createdAt = new Date()

  const validUntil = new Date(createdAt)
  validUntil.setDate(validUntil.getDate() + (company.quotationValidityDays || 3))

  const quotation = {
    id: getStore().reduce((max, entry) => Math.max(max, entry.id), 0) + 1,
    customerId: Number(input.customerId),
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

  const priced = priceQuotation(input)
  const updated = {
    ...existing,
    customerId: Number(input.customerId),
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
