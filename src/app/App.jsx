import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/features/auth'
import { router } from './router'

/**
 * Composition root.
 *
 * AuthProvider sits above RouterProvider so the session resolves once for the
 * whole app and guards can read it. Context still reaches route components
 * from here — only router hooks require being inside RouterProvider.
 */
export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
