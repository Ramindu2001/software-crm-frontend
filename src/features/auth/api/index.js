import * as mockImpl from './auth.mock'
import * as httpImpl from './auth.http'

/**
 * Selects the auth implementation.
 *
 * `import.meta.env.VITE_AUTH_API` is referenced directly rather than through a
 * re-exported constant: Vite replaces it with a literal at build time, so the
 * comparison folds to a constant and the unused branch becomes eliminable.
 * Routing it through config/constants.js would defeat that.
 *
 * Set VITE_AUTH_API=http to point at the real backend. Every other feature
 * keeps its own flag, so modules can migrate one at a time.
 */
const USE_HTTP = import.meta.env.VITE_AUTH_API === 'http'

const impl = USE_HTTP ? httpImpl : mockImpl

export const login = impl.login
export const logout = impl.logout
export const getCurrentUser = impl.getCurrentUser
export const AuthError = impl.AuthError

/** null in HTTP mode — the login screen hides its demo panel accordingly. */
export const DEMO_CREDENTIALS = impl.DEMO_CREDENTIALS

export const IS_MOCK_AUTH = !USE_HTTP

// Session storage is transport-independent, so it is shared by both.
export { getSessionToken, clearSession as purgeSession } from './session'
