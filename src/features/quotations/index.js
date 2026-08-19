/**
 * Public API for the `quotations` feature.
 *
 * The document, its builder, and the list around it. The printable view is
 * exported because the router mounts it outside the dashboard shell — it is a
 * page in its own right, not a panel.
 */

export { QuotationsPage } from './components/QuotationsPage'
export { QuotationFormPage } from './components/QuotationFormPage'
export { QuotationDetailPage } from './components/QuotationDetailPage'
export { QuotationPrintPage } from './components/QuotationPrintPage'

/** Exported for reuse — the document renders identically wherever it is used. */
export { QuotationDocument } from './components/QuotationDocument'

export { useQuotations, useQuotation } from './hooks'
export {
  QUOTATION_STATUS,
  QUOTATION_STATUS_OPTIONS,
  isEditable,
} from './constants'
