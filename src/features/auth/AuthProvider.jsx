import { useCallback, useEffect, useMemo, useState } from 'react'
import { configureApiClient } from '@/lib/apiClient'
import { toast } from '@/lib/toastStore'
import { AuthContext } from './AuthContext'
import { can as checkPermission } from './permissions'
import {
  getCurrentUser,
  getSessionToken,
  login as apiLogin,
  logout as apiLogout,
  purgeSession,
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

  // Registered before the bootstrap effect below, so the very first request
  // already carries a token. configureApiClient returns a restore function,
  // which doubles as the cleanup.
  useEffect(
    () =>
      configureApiClient({
        // Request interceptor: read from storage on every call rather than
        // capturing a token here, so a session cleared in another tab stops
        // authorising requests immediately.
        getToken: getSessionToken,

        // Response interceptor: the server rejected our token, so the session
        // is gone regardless of what this tab believes. Purge and flip status;
        // RequireAuth handles the redirect.
        onUnauthorized: () => {
          purgeSession()
          setState({ status: 'unauthenticated', user: null })
        },
      }),
    [],
  )

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

    const firstName = session.user.name?.trim().split(/\s+/)[0]
    toast.success(firstName ? `Welcome back, ${firstName}` : 'Signed in')

    return session.user
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    // No explicit redirect: flipping to unauthenticated makes RequireAuth
    // render its <Navigate>, so the routing layer stays the single authority
    // on where a signed-out user belongs.
    setState({ status: 'unauthenticated', user: null })
    toast.info('You have been signed out')
  }, [])

  const value = useMemo(
    () => ({
      status: state.status,
      user: state.user,
      isAuthenticated: state.status === 'authenticated',
      login,
      logout,
      /**
       * Whether the signed-in user may perform an action the API role-guards.
       * Bound to the current user here so call sites read as
       * `can('products:write')` rather than threading the user through.
       */
      can: (permission) => checkPermission(state.user, permission),
    }),
    [state, login, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
