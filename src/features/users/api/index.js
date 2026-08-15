import * as mockImpl from './users.mock'
import * as httpImpl from './users.http'

/**
 * Selects the users / access-control implementation.
 *
 * Set VITE_USERS_API=mock to work offline. `import.meta.env` is read directly
 * here (not via config/constants.js) so Vite's build-time replacement lets the
 * comparison fold to a constant and the unused branch becomes eliminable.
 */
const USE_HTTP = import.meta.env.VITE_USERS_API === 'http'

const impl = USE_HTTP ? httpImpl : mockImpl

// Users
export const listUsers = impl.listUsers
export const getUser = impl.getUser
export const createUser = impl.createUser
export const updateUser = impl.updateUser
/** The soft delete — deactivating keeps ticket history and comment authorship. */
export const updateUserStatus = impl.updateUserStatus
export const resetUserPassword = impl.resetUserPassword
export const listUserOptions = impl.listUserOptions

// Roles and permissions
export const listRoles = impl.listRoles
export const listPermissionCatalogue = impl.listPermissionCatalogue
export const updateRolePermissions = impl.updateRolePermissions

export const NotFoundError = impl.NotFoundError
/** Thrown when another user already holds the submitted email (409). */
export const DuplicateEmailError = impl.DuplicateEmailError
/**
 * Thrown when a write is refused to keep the system administrable —
 * deactivating yourself, removing the last active Admin, or editing the
 * locked Admin role.
 */
export const SafetyRuleError = impl.SafetyRuleError

/**
 * There is deliberately no deleteUser: users are referenced by
 * ticket_comments.user_id and tickets.assigned_developer_id, so deleting one
 * would erase authorship from comment threads. updateUserStatus(id, false) is
 * the soft delete.
 *
 * There is also no createRole: roles.name is an ENUM, so the set of roles is
 * fixed until that column becomes a VARCHAR.
 */

export const IS_MOCK_USERS = !USE_HTTP
