/**
 * Public API for the `customers` feature.
 *
 * Other features and app-level code import ONLY from this barrel — never from
 * `features/customers/components/...` directly. That keeps the feature free to
 * reorganise its internals without breaking the rest of the app, and makes
 * cross-feature coupling visible in one place.
 */

export { CustomersPage } from './components/CustomersPage'

// Exported for cross-feature reuse (e.g. a customers widget on the dashboard).
export { useCustomers } from './hooks/useCustomers'
export { useCustomer } from './hooks/useCustomer'
