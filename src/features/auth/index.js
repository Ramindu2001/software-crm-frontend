/**
 * Public API for the `auth` feature.
 *
 * The session context lives here rather than in app/providers so that
 * features and layouts can consume it without importing upwards from
 * app/ — which would invert the dependency direction the architecture
 * depends on. app/ composes AuthProvider; everyone else reads useAuth.
 */

export { AuthProvider } from './AuthProvider'
export { useAuth } from './AuthContext'
export { LoginPage } from './components/LoginPage'

/**
 * The permission keys and the raw checks.
 *
 * Prefer `can()` off `useAuth()` in components — it is already bound to the
 * signed-in user. These exports are for the cases that are not a component:
 * route guards, and anything reasoning about roles rather than permissions.
 */
export { ROLES, ROLE_VALUES, PERMISSIONS, can, canAll, canAny } from './permissions'
