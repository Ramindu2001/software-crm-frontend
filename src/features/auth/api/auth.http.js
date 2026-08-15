import { api } from '@/lib/apiClient'
import { deriveInitials, unwrap } from '@/lib/apiEnvelope'
import {
  clearSession,
  DEFAULT_SESSION_TTL_MS,
  isSessionExpired,
  readSession,
  writeSession,
} from './session'

/**
 * Real auth endpoints.
 *
 *   POST /api/auth/login   public   -> { token, user: { id, name, email, role } }
 *   GET  /api/auth/me      bearer   -> { id, name, email, role }
 *   POST /api/auth/logout  bearer   -> null
 *
 * The server re-reads the user from the database on every authenticated
 * request, so a role change or a deleted account takes effect immediately
 * rather than when the token expires.
 */

export class AuthError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AuthError'
    this.status = 401
  }
}

/** No demo account against a real backend. */
export const DEMO_CREDENTIALS = null

/** Normalises the server payload into the shape the UI expects. */
function mapUser(raw) {
  if (!raw) return null
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    // 'Admin' | 'Support' | 'Developer'. Shown in the UI; the role name is
    // NOT what authorisation is decided on — `permissions` is.
    role: raw.role ?? null,
    /**
     * The effective grant list for this user's role, which every `can()`
     * check reads. Defaulted to an empty array rather than left undefined so
     * a malformed response fails closed: no permissions means no controls,
     * not every control.
     */
    permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
    /** True after an admin set or reset the password. */
    mustChangePassword: Boolean(raw.must_change_password),
    initials: raw.initials ?? deriveInitials(raw.name),
  }
}

/**
 * Read the `exp` claim out of a JWT, in milliseconds.
 *
 * The login response carries no expiry field of its own, but the token itself
 * states when it dies (JWT_EXPIRES_IN, 1d by default). Without this the client
 * would fall back to its own 8-hour guess and sign the user out three times a
 * day while the token was still perfectly valid.
 *
 * Decode only — this is a display/expiry hint, never a trust decision. The
 * signature is the server's business, and a token we misread simply produces
 * a 401 that the interceptor already handles.
 *
 * @returns {number|null} Epoch ms, or null if the token is unreadable.
 */
function readTokenExpiry(token) {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null

    // base64url -> base64, then pad to a multiple of 4.
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const { exp } = JSON.parse(atob(padded))

    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    // Malformed or unusually encoded token — fall back to the default TTL.
    return null
  }
}

function resolveExpiry(payload) {
  if (payload.expires_at) return new Date(payload.expires_at).getTime()
  if (payload.expires_in) return Date.now() + payload.expires_in * 1000

  const fromToken = payload.token ? readTokenExpiry(payload.token) : null
  return fromToken ?? Date.now() + DEFAULT_SESSION_TTL_MS
}

/**
 * @param {{email: string, password: string, remember?: boolean}} credentials
 * @returns {Promise<{token: string, user: object, expiresAt: number}>}
 */
export async function login({ email, password, remember = false }) {
  let payload
  try {
    payload = await api.post(
      '/auth/login',
      { email: email.trim(), password },
      {
        // No token to send yet, and a 401 here means "wrong password", not
        // "your session expired" — firing the global handler would be wrong.
        auth: false,
        handleUnauthorized: false,
      },
    )
  } catch (error) {
    // 401 is "Invalid email or password" — deliberately the same message for
    // an unknown email as for a wrong password, so this endpoint cannot be
    // used to discover which addresses are registered. 422 means a malformed
    // or missing field; `detail` carries the server's own wording.
    if (error.status === 401 || error.status === 422) {
      throw new AuthError(error.detail || 'The email or password is incorrect.')
    }
    throw error
  }

  const rawData = unwrap(payload)

  const session = {
    token: rawData.token ?? rawData.access_token,
    user: mapUser(rawData.user ?? rawData),
    expiresAt: resolveExpiry(rawData),
  }

  writeSession(session, remember)
  return session
}

/**
 * Verifies the stored token against the server.
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  const session = readSession()
  if (!session || isSessionExpired(session)) {
    clearSession()
    return null
  }

  try {
    const payload = await api.get('/auth/me', {
      // Bootstrap handles its own 401: AuthProvider is already about to mark
      // the app signed out, and firing the global handler would double up.
      handleUnauthorized: false,
    })
    return mapUser(unwrap(payload))
  } catch (error) {
    if (error.status === 401) {
      clearSession()
      return null
    }
    throw error
  }
}

export async function logout() {
  try {
    await api.post('/auth/logout', undefined, { handleUnauthorized: false })
  } catch {
    // The local session is cleared regardless — the user asked to sign out,
    // and a failed server call must not strand them signed in.
  } finally {
    clearSession()
  }
}
