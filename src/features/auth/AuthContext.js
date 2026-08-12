import { createContext, useContext } from 'react'

/**
 * @typedef {object} AuthValue
 * @property {'loading'|'authenticated'|'unauthenticated'} status
 * @property {object|null} user
 * @property {boolean} isAuthenticated
 * @property {(credentials: object) => Promise<object>} login
 * @property {() => Promise<void>} logout
 */

/** null means "no provider above" — useAuth turns that into a loud error. */
export const AuthContext = createContext(null)

/**
 * Read the current session.
 * @returns {AuthValue}
 */
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error('useAuth must be used within an <AuthProvider>.')
  }

  return context
}
