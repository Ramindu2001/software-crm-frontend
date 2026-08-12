import { api } from '@/lib/apiClient'
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
 * Endpoint paths and payload shapes are a best guess at the Laravel API and
 * are the first thing to adjust once it exists — the surrounding contract
 * (what these functions accept and return) is what must stay fixed.
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

function deriveInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts.at(-1)[0]).toUpperCase()
}

/** Normalises the server payload into the shape the UI expects. */
function mapUser(raw) {
  if (!raw) return null
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role ?? null,
    initials: raw.initials ?? deriveInitials(raw.name),
  }
}

function resolveExpiry(payload) {
  if (payload.expires_at) return new Date(payload.expires_at).getTime()
  if (payload.expires_in) return Date.now() + payload.expires_in * 1000
  return Date.now() + DEFAULT_SESSION_TTL_MS
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
    if (error.status === 401 || error.status === 422) {
      throw new AuthError(error.message || 'The email or password is incorrect.')
    }
    throw error
  }

  const session = {
    token: payload.token ?? payload.access_token,
    user: mapUser(payload.user ?? payload.data),
    expiresAt: resolveExpiry(payload),
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
    return mapUser(payload.data ?? payload)
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
