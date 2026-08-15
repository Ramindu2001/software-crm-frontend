/**
 * Quotation domain vocabulary.
 *
 * Keys are the API's values verbatim — `quotations.status` is
 * enum('Pending','Approved','Rejected') — so a filter value goes straight onto
 * the query string and a response value looks itself up with no translation.
 *
 * Transitions are unrestricted: the API enforces no workflow, so an approved
 * quotation can still be corrected to rejected.
 */

export const QUOTATION_STATUS = {
  Pending: { value: 'Pending', label: 'Pending', tone: 'warning', rank: 0 },
  Approved: { value: 'Approved', label: 'Approved', tone: 'success', rank: 1 },
  Rejected: { value: 'Rejected', label: 'Rejected', tone: 'danger', rank: 2 },
}

export const QUOTATION_STATUS_OPTIONS = Object.values(QUOTATION_STATUS)
  .sort((a, b) => a.rank - b.rank)
  .map(({ value, label }) => ({ value, label }))

/**
 * Only a Pending quotation may be edited. Once the customer has approved or
 * rejected a specific document, changing it is a new quotation rather than an
 * edit — and the API refuses it with a 409 regardless.
 */
export const isEditable = (quotation) => quotation?.status === 'Pending'

/**
 * `product_packages` carries three fees; the plan decides which one prices a
 * line and which are shown as context.
 *
 *   Annual  -> first-year fee, with the renewal fee shown from year two
 *   Monthly -> monthly price
 */
export const PLAN = {
  Annual: {
    value: 'Annual',
    label: 'Annual',
    priceField: 'firstYearPrice',
    description: 'First year, then the renewal rate',
  },
  Monthly: {
    value: 'Monthly',
    label: 'Monthly',
    priceField: 'monthlyPrice',
    description: 'Billed every month',
  },
}

export const PLAN_OPTIONS = Object.values(PLAN).map(({ value, label }) => ({
  value,
  label,
}))

/** Sri Lankan rupees, matching the printed template. */
export const CURRENCY = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** "Rs. 60,000.00" — the exact form used on the paper template. */
export const formatRupees = (amount) =>
  `Rs. ${Number(amount ?? 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
