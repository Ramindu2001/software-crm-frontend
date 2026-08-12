import {
  clearSession,
  DEFAULT_SESSION_TTL_MS,
  isSessionExpired,
  readSession,
  writeSession,
} from './session'

/**
 * Mock auth implementation, standing in for the Laravel backend.
 *
 * The session shape it produces is identical to auth.http.js, so swapping
 * between them changes nothing above the api/ module.
 */

const LATENCY_MS = 600

const delay = (ms = LATENCY_MS) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export class AuthError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AuthError'
    this.status = 401
  }
}

// Seeded accounts. Passwords live here only because this is a mock — a real
// backend never sends them to the client.
const USERS = [
  {
    id: 'usr_01',
    name: 'Alex Fernando',
    email: 'alex@synnex.com',
    password: 'synnex123',
    role: 'Admin',
    initials: 'AF',
  },
  {
    id: 'usr_02',
    name: 'Nadia Perera',
    email: 'nadia@synnex.com',
    password: 'synnex123',
    role: 'Engineer',
    initials: 'NP',
  },
]

/** Demo credentials surfaced on the login screen while the backend is mocked. */
export const DEMO_CREDENTIALS = {
  email: 'alex@synnex.com',
  password: 'synnex123',
}

/**
 * Builds the client-facing user object.
 *
 * An explicit allowlist rather than destructuring the password away: omitting
 * fields is a denylist, so any sensitive field added to USERS later would leak
 * by default. This way new fields stay private until deliberately exposed.
 */
function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    initials: user.initials,
  }
}

function createToken(user) {
  const payload = btoa(
    JSON.stringify({ sub: user.id, email: user.email, iat: Date.now() }),
  )
  return `mock.${payload}.${Math.random().toString(36).slice(2, 12)}`
}

/**
 * @param {{email: string, password: string, remember?: boolean}} credentials
 * @returns {Promise<{token: string, user: object, expiresAt: number}>}
 * @throws {AuthError} On unknown email or wrong password.
 */
export async function login({ email, password, remember = false }) {
  await delay()

  const normalizedEmail = email.trim().toLowerCase()
  const match = USERS.find(
    (user) =>
      user.email.toLowerCase() === normalizedEmail && user.password === password,
  )

  // Deliberately identical message for unknown email and wrong password, so
  // the form can't be used to enumerate which accounts exist.
  if (!match) {
    throw new AuthError('The email or password is incorrect.')
  }

  const session = {
    token: createToken(match),
    user: toPublicUser(match),
    expiresAt: Date.now() + DEFAULT_SESSION_TTL_MS,
  }

  writeSession(session, remember)
  return session
}

/**
 * Resolves the stored session, or null when absent or expired.
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  await delay(250)

  const session = readSession()
  if (!session) return null

  if (isSessionExpired(session)) {
    clearSession()
    return null
  }

  return session.user
}

export async function logout() {
  await delay(150)
  clearSession()
}
