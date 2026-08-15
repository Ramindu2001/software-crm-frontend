import * as mockImpl from './quotations.mock'
import * as httpImpl from './quotations.http'

/**
 * Selects the quotations implementation.
 *
 * `import.meta.env` is read directly here (not via config/constants.js) so
 * Vite's build-time replacement lets the comparison fold to a constant and the
 * unused branch becomes eliminable.
 */
const USE_HTTP = import.meta.env.VITE_QUOTATIONS_API === 'http'

const impl = USE_HTTP ? httpImpl : mockImpl

export const listQuotations = impl.listQuotations
/** The full document — snapshot line items plus the live company letterhead. */
export const getQuotation = impl.getQuotation
export const createQuotation = impl.createQuotation
/** Pending quotations only; anything else is refused with NotEditableError. */
export const updateQuotation = impl.updateQuotation
export const updateQuotationStatus = impl.updateQuotationStatus

export const NotFoundError = impl.NotFoundError
/** Thrown when a quotation has been approved or rejected and is now frozen. */
export const NotEditableError = impl.NotEditableError

/**
 * There is deliberately no deleteQuotation: a quotation is a document that was
 * sent to a customer, and invoices.quotation_id references it. Rejecting is
 * the way to take one out of play.
 */

export const IS_MOCK_QUOTATIONS = !USE_HTTP
