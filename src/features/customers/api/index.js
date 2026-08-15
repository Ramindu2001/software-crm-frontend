import * as mockImpl from './customers.mock'
import * as httpImpl from './customers.http'

/**
 * Selects the customers implementation.
 *
 * Set VITE_CUSTOMERS_API=mock to work offline. The flag is per feature, so
 * customers can be swapped independently of issues or auth.
 *
 * `import.meta.env` is read directly here (not via config/constants.js) so
 * Vite's build-time replacement lets the comparison fold to a constant.
 */
const USE_HTTP = import.meta.env.VITE_CUSTOMERS_API === 'http'

const impl = USE_HTTP ? httpImpl : mockImpl

export const listCustomers = impl.listCustomers
export const getCustomer = impl.getCustomer
export const createCustomer = impl.createCustomer
/** Full replacement — omitted phone/address are cleared, not kept. */
export const updateCustomer = impl.updateCustomer
/** Every customer as {value, label}, for the issue and quotation pickers. */
export const listCustomerOptions = impl.listCustomerOptions

export const NotFoundError = impl.NotFoundError
/** Thrown when another customer already holds the submitted email (409). */
export const DuplicateEmailError = impl.DuplicateEmailError

/**
 * There is deliberately no deleteCustomer: customers are referenced by
 * tickets, quotations and subscriptions, so one with history cannot be
 * removed, and the table has no status column to soft-delete with.
 */

export const IS_MOCK_CUSTOMERS = !USE_HTTP
