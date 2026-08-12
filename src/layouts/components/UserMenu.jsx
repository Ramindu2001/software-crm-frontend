import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, LogOut, Settings, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useEscapeKey } from '@/hooks/useEscapeKey'

// Placeholder until the auth feature exists.
const CURRENT_USER = {
  name: 'Alex Fernando',
  email: 'alex@synnex.com',
  initials: 'AF',
}

const ITEM_CLASS =
  'flex w-full items-center gap-2.5 px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-sunken hover:text-ink'

/**
 * Account dropdown.
 *
 * Intentionally not `role="menu"` — that role implies arrow-key roving
 * tabindex navigation. Plain links and buttons give correct Tab behaviour
 * without over-promising a keyboard contract we haven't implemented.
 */
export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const menuId = useId()

  useClickOutside(containerRef, () => setIsOpen(false), isOpen)
  useEscapeKey(() => setIsOpen(false), isOpen)

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={menuId}
        className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-sunken"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
          {CURRENT_USER.initials}
        </span>
        <span className="hidden text-sm font-medium text-ink sm:block">
          {CURRENT_USER.name}
        </span>
        <ChevronDown
          className={cn(
            'size-4 text-ink-subtle transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={menuId}
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-card bg-surface py-1 shadow-panel ring-1 ring-line"
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-sm font-medium text-ink">
              {CURRENT_USER.name}
            </p>
            <p className="truncate text-xs text-ink-muted">
              {CURRENT_USER.email}
            </p>
          </div>

          <div className="py-1">
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className={ITEM_CLASS}
            >
              <User className="size-4" aria-hidden="true" />
              Your profile
            </Link>
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className={ITEM_CLASS}
            >
              <Settings className="size-4" aria-hidden="true" />
              Settings
            </Link>
          </div>

          <div className="border-t border-line py-1">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={cn(ITEM_CLASS, 'hover:bg-danger-soft hover:text-danger-strong')}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
