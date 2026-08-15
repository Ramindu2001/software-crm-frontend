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
export const createQuotation = impl.createQuotation
export const updateQuotationStatus = impl.updateQuotationStatus
export const NotFoundError = impl.NotFoundError

/**
 * There is deliberately no getQuotation: the API has no GET /:id, so a
 * quotation's line items cannot be read back after creation. Adding that
 * endpoint is what a quotation detail view would need first.
 */

export const IS_MOCK_QUOTATIONS = !USE_HTTP
