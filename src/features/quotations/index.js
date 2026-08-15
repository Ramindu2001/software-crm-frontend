/**
 * Public API for the `quotations` feature.
 *
 * No detail hook is exported: the backend has no GET /api/quotations/:id, so
 * everything on screen comes from the list response.
 */

export { QuotationsPage } from './components/QuotationsPage'

export { useQuotations } from './hooks/useQuotations'
export { QUOTATION_STATUS, QUOTATION_STATUS_OPTIONS } from './constants'
