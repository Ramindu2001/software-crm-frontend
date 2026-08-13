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
export const createCustomer = impl.createCustomer
export const updateCustomer = impl.updateCustomer
export const NotFoundError = impl.NotFoundError

export const IS_MOCK_CUSTOMERS = !USE_HTTP
