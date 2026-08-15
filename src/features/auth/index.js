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

// The role vocabulary and the permission table, for anything that needs to
// reason about roles beyond `can()` — e.g. rendering the current user's role.
export { ROLES, ROLE_VALUES, can } from './permissions'
