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
