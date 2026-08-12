import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { RouteFallback } from '@/components/common'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'

const SIDEBAR_STORAGE_KEY = 'synnex:sidebar-collapsed'

// Matches the `lg:` breakpoint the sidebar switches modes at.
const DESKTOP_QUERY = '(min-width: 64rem)'

/**
 * App shell: persistent sidebar + topbar with a routed content area.
 *
 * Owns both sidebar states because they are genuinely different things —
 * `isCollapsed` is a remembered desktop preference, `isMobileOpen` is
 * ephemeral drawer state that should never outlive a navigation.
 */
export function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useLocalStorage(
    SIDEBAR_STORAGE_KEY,
    false,
  )
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const location = useLocation()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)

  // The drawer only exists below `lg`. Deriving this rather than storing it
  // means resizing to desktop with the drawer open resolves in one render —
  // and, critically, the focus trap never engages on the static desktop rail.
  const isDrawerOpen = isMobileOpen && !isDesktop

  // Close the drawer whenever the route changes — covers browser back/forward
  // and programmatic navigation. Adjusting state during render (rather than in
  // an effect) avoids a cascading render where the drawer paints open on the
  // new route before closing. Nav items also close it directly on click, which
  // handles tapping the route you are already on, where location never changes.
  const [lastPath, setLastPath] = useState(location.pathname)
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setIsMobileOpen(false)
  }

  useBodyScrollLock(isDrawerOpen)
  useEscapeKey(() => setIsMobileOpen(false), isDrawerOpen)

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((collapsed) => !collapsed)}
        isMobileOpen={isDrawerOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* min-w-0 lets wide children (tables) scroll instead of stretching
          the flex track and pushing the sidebar off-screen. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileSidebar={() => setIsMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">
          {/* Boundary sits inside the shell so the sidebar and topbar stay
              painted while a route chunk downloads. */}
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
