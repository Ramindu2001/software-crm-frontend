/**
 * Public API for the `users` feature — team members and the role permissions
 * that govern them.
 *
 * Users and roles live in one feature rather than two because they are one
 * concern: a role is only meaningful through the users that hold it, the
 * matrix shows user counts per role, and both screens sit behind the same
 * administration surface. Splitting them would mean two features importing
 * each other's internals, which rule 2 of the architecture forbids.
 */

export { UsersPage } from './components/UsersPage'
export { RolesPage } from './components/RolesPage'

export { useUsers, useRolePermissions } from './hooks'

export { USER_ROLE, USER_ROLE_OPTIONS } from './constants'
