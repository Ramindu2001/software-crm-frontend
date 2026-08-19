import { useMemo, useRef } from 'react'
import { ChevronsLeft, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/config/constants'
import { NAV_ITEMS } from '@/config/navigation'
import { Button } from '@/components/ui'
import { useAuth } from '@/features/auth'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { SidebarNavItem } from './SidebarNavItem'

/**
 * Primary navigation.
 *
 * Two responsive modes from one component:
 * - desktop (lg+): static rail, collapses 16rem -> 4.5rem, icons stay visible
 * - mobile: off-canvas drawer with a backdrop
 *
 * @param {object} props
 * @param {boolean} props.isCollapsed Desktop rail state.
 * @param {() => void} props.onToggleCollapse
 * @param {boolean} props.isMobileOpen Drawer state. Must already account for
 *   viewport size — the caller passes false on desktop so focus is never
 *   trapped in the static rail.
 * @param {() => void} props.onCloseMobile
 */
export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) {
  const asideRef = useRef(null)
  const { can } = useAuth()

  // Only traps while the drawer is genuinely open on a small viewport.
  useFocusTrap(asideRef, isMobileOpen)

  // Hide sections the user cannot open. Presentation only — every route
  // guards itself, and the API re-checks after that.
  const navItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.permission || can(item.permission)),
    [can],
  )

  return (
    <>
      {/* Mobile backdrop — desktop never needs one. */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-ink/40 transition-opacity duration-200 lg:hidden',
          isMobileOpen
            ? 'opacity-100'
            : 'pointer-events-none opacity-0',
        )}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        ref={asideRef}
        // Focusable so the trap can place focus on the drawer itself.
        tabIndex={-1}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-surface ring-1 ring-line',
          'transition-[transform,width] duration-200 ease-out',
          // Desktop: back in flow so it reserves its own column, but pinned to
          // the top of the viewport so the rail stays put while the page
          // scrolls. Sticky rather than fixed keeps the layout honest — a fixed
          // rail is out of flow and the content column would have to be pushed
          // clear of it by a hand-maintained margin that silently breaks the
          // moment the collapsed width changes.
          //
          // `h-screen` is what makes it stick: the flex parent stretches items
          // to full container height by default, and an item as tall as its own
          // scroll range has nothing left to travel. `bottom-auto` undoes the
          // mobile `inset-y-0`, leaving `top-0` as the only sticky constraint.
          //
          // z-index drops to the topbar's level here. `static` made the mobile
          // drawer's z-50 inert on desktop; positioning the rail activates it,
          // which would leave it tied with the z-50 modal overlay and settled
          // only by portal order. Chrome sits at 30, overlays own 50 upward.
          'lg:sticky lg:top-0 lg:bottom-auto lg:z-30 lg:h-screen lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-64',
        )}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 px-4">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-ink-inverse">
            S
          </div>
          <span
            className={cn(
              'truncate text-sm font-semibold text-ink',
              isCollapsed && 'lg:hidden',
            )}
          >
            {APP_NAME}
          </span>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="ml-auto rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-sunken hover:text-ink lg:hidden"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav
          aria-label="Main navigation"
          className="flex-1 space-y-1 overflow-y-auto px-3 py-2"
        >
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.to}
              item={item}
              isCollapsed={isCollapsed}
              onNavigate={onCloseMobile}
            />
          ))}
        </nav>

        {/* Collapse control — desktop only; mobile closes via backdrop or X. */}
        <div className="hidden shrink-0 border-t border-line p-3 lg:block">
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(!isCollapsed && 'justify-start')}
          >
            <ChevronsLeft
              className={cn(
                'size-4 shrink-0 transition-transform duration-200',
                isCollapsed && 'rotate-180',
              )}
              aria-hidden="true"
            />
            <span className={cn(isCollapsed && 'hidden')}>Collapse</span>
          </Button>
        </div>
      </aside>
    </>
  )
}
