/**
 * Permission checks for the UI.
 *
 * These used to be a static table mirroring hardcoded `authorize(ROLES…)`
 * guards. They are not any more: an admin can now change what each role may
 * do at runtime, so a table baked into the bundle would gate the UI on rules
 * that were true when the app was built rather than the ones in force now.
 *
 * The source of truth is `user.permissions` — the effective grant list the API
 * returns from POST /api/auth/login and GET /api/auth/me. The server re-reads
 * it on every authenticated request, so a revoked permission is gone from the
 * next `/me` rather than lingering until the token expires.
 *
 * The server is still the authority. Every key below is re-checked by
 * `requirePermission()` on the matching route, and a request that slips past a
 * check here still comes back 403. What this buys is that the UI does not
 * offer an action the caller cannot perform — a button that 403s reads as a
 * broken app, not as a permission boundary.
 */

export const ROLES = {
  ADMIN: 'Admin',
  SUPPORT: 'Support',
  DEVELOPER: 'Developer',
}

export const ROLE_VALUES = Object.values(ROLES)

/**
 * Every permission key the UI checks, mirroring the backend catalogue in
 * `utils/permissions.js`.
 *
 * Kept as a named map so call sites read as `PERMISSIONS.ISSUES_CREATE` and a
 * typo is a build-time undefined rather than a silently-false check. Adding
 * one here does nothing on its own — a permission only exists once the
 * backend catalogue and a route guard both know about it.
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard:view',

  ISSUES_VIEW: 'issues:view',
  ISSUES_CREATE: 'issues:create',
  ISSUES_SET_STATUS: 'issues:setStatus',

  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_WRITE: 'customers:write',

  PRODUCTS_VIEW: 'products:view',
  PRODUCTS_WRITE: 'products:write',

  QUOTATIONS_VIEW: 'quotations:view',
  QUOTATIONS_CREATE: 'quotations:create',
  QUOTATIONS_SET_STATUS: 'quotations:setStatus',

  USERS_VIEW: 'users:view',
  USERS_MANAGE: 'users:manage',
  ROLES_MANAGE: 'roles:manage',
}

const KNOWN_KEYS = new Set(Object.values(PERMISSIONS))

/**
 * Whether the signed-in user holds a permission.
 *
 * Fails closed on every uncertain input — no user, no permission list, or a
 * key the UI does not know about. A typo therefore hides a control rather
 * than showing one that 403s, which is the cheaper failure of the two.
 *
 * @param {{permissions?: string[]}|null} user
 * @param {string} permission A value from PERMISSIONS.
 * @returns {boolean}
 */
export function can(user, permission) {
  if (!user || !Array.isArray(user.permissions)) return false
  if (!KNOWN_KEYS.has(permission)) return false
  return user.permissions.includes(permission)
}

/**
 * Whether the user holds every permission listed.
 * Used by route guards that protect a screen needing more than one.
 *
 * @param {{permissions?: string[]}|null} user
 * @param {string[]} permissions
 */
export function canAll(user, permissions = []) {
  return permissions.every((permission) => can(user, permission))
}

/**
 * Whether the user holds at least one of the permissions listed.
 * Used for navigation, where a section is worth showing if any of its screens
 * is reachable.
 *
 * @param {{permissions?: string[]}|null} user
 * @param {string[]} permissions
 */
export function canAny(user, permissions = []) {
  return permissions.some((permission) => can(user, permission))
}
