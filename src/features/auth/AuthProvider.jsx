import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import {
  getCurrentUser,
  login as apiLogin,
  logout as apiLogout,
} from './api'

/**
 * Owns session state for the whole app.
 *
 * Status starts at 'loading' and stays there until the stored session has been
 * checked. Guards render a splash during that window, which is what stops a
 * refresh on /dashboard from flashing the login page before the session
 * resolves.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null })

  useEffect(() => {
    let ignore = false

    getCurrentUser()
      .then((user) => {
        if (ignore) return
        setState({
          status: user ? 'authenticated' : 'unauthenticated',
          user,
        })
      })
      .catch(() => {
        // A failed bootstrap is treated as signed out rather than surfaced —
        // there is nothing the user can act on at this point.
        if (!ignore) setState({ status: 'unauthenticated', user: null })
      })

    return () => {
      ignore = true
    }
  }, [])

  // Errors propagate to the caller so the login form can render them; only
  // success touches global state.
  const login = useCallback(async (credentials) => {
    const session = await apiLogin(credentials)
    setState({ status: 'authenticated', user: session.user })
    return session.user
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    // No explicit redirect: flipping to unauthenticated makes RequireAuth
    // render its <Navigate>, so the routing layer stays the single authority
    // on where a signed-out user belongs.
    setState({ status: 'unauthenticated', user: null })
  }, [])

  const value = useMemo(
    () => ({
      status: state.status,
      user: state.user,
      isAuthenticated: state.status === 'authenticated',
      login,
      logout,
    }),
    [state, login, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
