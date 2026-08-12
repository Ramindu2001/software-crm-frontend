import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/features/auth'
import { ToastViewport } from '@/components/ui'
import { router } from './router'
import { registerApiErrorToasts } from './apiErrorToasts'

/**
 * Composition root.
 *
 * AuthProvider sits above RouterProvider so the session resolves once for the
 * whole app and guards can read it. Context still reaches route components
 * from here — only router hooks require being inside RouterProvider.
 *
 * ToastViewport is a sibling of the router, not a descendant, so a toast
 * outlives the navigation that triggered it — "Signed out" has to survive the
 * redirect to /login.
 */
export default function App() {
  useEffect(() => registerApiErrorToasts(), [])

  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <ToastViewport />
    </AuthProvider>
  )
}
