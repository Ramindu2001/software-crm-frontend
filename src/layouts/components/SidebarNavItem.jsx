import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui'

/**
 * A single sidebar link.
 *
 * @param {object} props
 * @param {{to: string, label: string, icon: React.ElementType, badge?: number}} props.item
 * @param {boolean} props.isCollapsed
 * @param {() => void} [props.onNavigate] Closes the mobile drawer after a tap.
 */
export function SidebarNavItem({ item, isCollapsed, onNavigate }) {
  const { to, label, icon: Icon, badge } = item

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      // Native tooltip is the accessible fallback once labels are hidden.
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-ink-muted hover:bg-sunken hover:text-ink',
          isCollapsed && 'lg:justify-center lg:px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Indicator bar carries the active state when the label is hidden —
              a background tint alone is too weak a signal at 72px. */}
          {isActive && (
            <span
              className="absolute left-0 h-5 w-0.5 rounded-r-full bg-brand-600"
              aria-hidden="true"
            />
          )}

          <Icon className="size-5 shrink-0" aria-hidden="true" />

          {/* sr-only rather than hidden: the accessible name survives collapse. */}
          <span className={cn('truncate', isCollapsed && 'lg:sr-only')}>
            {label}
          </span>

          {badge != null && (
            <Badge
              tone={isActive ? 'brand' : 'neutral'}
              size="sm"
              className={cn('ml-auto', isCollapsed && 'lg:hidden')}
            >
              {badge}
            </Badge>
          )}
        </>
      )}
    </NavLink>
  )
}
