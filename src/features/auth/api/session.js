/**
 * Client-side session persistence.
 *
 * Shared by both the mock and HTTP auth implementations: where the session is
 * stored is a client concern, independent of how it was obtained.
 */

const SESSION_KEY = 'synnex:session'

/** 8 hours, roughly a working day. Only used when the server sends no expiry. */
export const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 8

/**
 * "Remember me" chooses the storage: localStorage survives a browser restart,
 * sessionStorage dies with the tab.
 */
function storageFor(remember) {
  return remember ? window.localStorage : window.sessionStorage
}

export function readSession() {
  // Checked in both places because we don't know which the user chose.
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const raw = storage.getItem(SESSION_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      // Storage unavailable or corrupt JSON — treat as no session.
    }
  }
  return null
}

export function writeSession(session, remember) {
  clearSession()
  try {
    storageFor(remember).setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Storage blocked (private mode). The session stays in memory for this
    // page life; the user simply won't be remembered on reload.
  }
}

export function clearSession() {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      storage.removeItem(SESSION_KEY)
    } catch {
      // Nothing useful to do.
    }
  }
}

/** True when there is no expiry, or it has passed. */
export function isSessionExpired(session) {
  return !session?.expiresAt || session.expiresAt <= Date.now()
}

/**
 * Current bearer token, or null.
 *
 * This is the request interceptor's source of truth. Read synchronously from
 * storage on every request rather than cached in memory, so a session cleared
 * in another tab stops authorising requests here too.
 *
 * @returns {string|null}
 */
export function getSessionToken() {
  const session = readSession()
  if (!session || isSessionExpired(session)) return null
  return session.token ?? null
}
