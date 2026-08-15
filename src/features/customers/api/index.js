import * as mockImpl from './customers.mock'
import * as httpImpl from './customers.http'

/**
 * Selects the customers implementation.
 *
 * Set VITE_CUSTOMERS_API=http to point at the real backend. The flag is per
 * feature, so customers can migrate independently of issues or auth.
 *
 * `import.meta.env` is read directly here (not via config/constants.js) so
 * Vite's build-time replacement lets the comparison fold to a constant.
 */
const USE_HTTP = import.meta.env.VITE_CUSTOMERS_API === 'http'

const impl = USE_HTTP ? httpImpl : mockImpl

export const listCustomers = impl.listCustomers
export const getCustomer = impl.getCustomer
/** Every customer as {value, label}, for the issue and quotation pickers. */
export const listCustomerOptions = impl.listCustomerOptions
export const NotFoundError = impl.NotFoundError

/**
 * There is deliberately no createCustomer / updateCustomer: the API exposes
 * GET /api/customers and nothing else. Records are inserted directly into the
 * database until a write endpoint exists.
 */

export const IS_MOCK_CUSTOMERS = !USE_HTTP
