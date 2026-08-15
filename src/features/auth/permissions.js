/**
 * Mirrors the role guards the API enforces.
 *
 * The server is the authority — every one of these is re-checked in
 * `middleware/role.middleware.js`, and a request that slips past this table
 * still comes back 403. This exists so the UI does not offer an action the
 * caller cannot perform: a Developer shown a "New issue" button gets a dead
 * end, which reads as a broken app rather than as a permission boundary.
 *
 * When a guard changes on the backend, change it here too.
 */

export const ROLES = {
  ADMIN: 'Admin',
  SUPPORT: 'Support',
  DEVELOPER: 'Developer',
}

const { ADMIN, SUPPORT, DEVELOPER } = ROLES

/**
 * Permission -> roles allowed to exercise it.
 *
 * Reads are absent on purpose: every list and detail endpoint is open to any
 * authenticated user, so gating them here would only add a lookup that always
 * says yes.
 */
const PERMISSIONS = {
  // POST /api/customers, PUT /api/customers/:id — Admin, Support. Developers
  // see the customer on every ticket but do not own the record.
  'customers:write': [ADMIN, SUPPORT],

  // POST /api/issues — Admin, Support. Developers work the queue rather than
  // filling it, but any authenticated user may move an issue's status, so
  // there is no permission for that.
  'issues:create': [ADMIN, SUPPORT],

  // POST /api/quotations, PATCH /api/quotations/:id/status — Admin, Support.
  // Quotations are a commercial document; Developers read but do not price.
  'quotations:create': [ADMIN, SUPPORT],
  'quotations:setStatus': [ADMIN, SUPPORT],

  // POST/PUT /api/products, PATCH /api/products/:id/status — Admin only.
  // The catalogue is configuration: it defines what the company sells and
  // what every quotation is priced against.
  'products:write': [ADMIN],
}

/** Every role, for the rare caller that needs to enumerate them. */
export const ROLE_VALUES = [ADMIN, SUPPORT, DEVELOPER]

/**
 * @param {{role?: string}|null} user
 * @param {keyof PERMISSIONS} permission
 * @returns {boolean} False for an unknown permission — failing closed means a
 *   typo hides a button, rather than showing one that 403s.
 */
export function can(user, permission) {
  const allowed = PERMISSIONS[permission]
  if (!allowed) return false
  return Boolean(user?.role) && allowed.includes(user.role)
}
