import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { FullPageLoader } from '@/components/common'

const DEFAULT_AUTHENTICATED_ROUTE = '/dashboard'

/**
 * Blocks a subtree until there is a session.
 *
 * While the stored session is being checked, a splash renders instead of a
 * redirect — otherwise every refresh on a protected page would bounce to
 * /login before the session resolved.
 */
export function RequireAuth({ children }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <FullPageLoader label="Checking your session…" />
  }

  if (status === 'unauthenticated') {
    // Remember where they were going so login can return them there.
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

/**
 * The inverse: keeps signed-in users off /login.
 *
 * Also handles the post-login redirect, which is why LoginPage does not
 * navigate itself — one authority for where an authenticated user belongs.
 */
export function RequireGuest({ children }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <FullPageLoader label="Checking your session…" />
  }

  if (status === 'authenticated') {
    const destination =
      location.state?.from?.pathname ?? DEFAULT_AUTHENTICATED_ROUTE
    return <Navigate to={destination} replace />
  }

  return children
}
