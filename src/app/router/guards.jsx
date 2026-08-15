import { Link, Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/features/auth'
import { EmptyState, FullPageLoader } from '@/components/common'
import { Button } from '@/components/ui'

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

/**
 * Blocks a route unless the user holds every permission listed.
 *
 * Hiding a navigation link is presentation, not access control — a URL typed
 * by hand, a stale bookmark, or a link shared by a colleague all reach the
 * route directly. This is the guard that actually stops them, and the API
 * re-checks regardless.
 *
 * Renders an explanation rather than redirecting: silently bouncing someone to
 * the dashboard reads as a broken link, while naming the missing permission
 * tells them what to ask an admin for.
 *
 * @param {object} props
 * @param {string[]} props.permissions Every one is required.
 */
export function RequirePermission({ permissions, children }) {
  const { status, canAll } = useAuth()

  if (status === 'loading') {
    return <FullPageLoader label="Checking your session…" />
  }

  if (!canAll(permissions)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Not permitted"
        description="You don't have access to this section. An administrator can grant it from Roles & permissions."
        action={
          <Button as={Link} to="/dashboard" size="sm">
            Back to dashboard
          </Button>
        }
      />
    )
  }

  return children
}
