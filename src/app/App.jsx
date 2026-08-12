import { RouterProvider } from 'react-router-dom'
import { router } from './router'

/**
 * Composition root. Future global providers (auth, theme, query client)
 * wrap RouterProvider here.
 */
export default function App() {
  return <RouterProvider router={router} />
}
