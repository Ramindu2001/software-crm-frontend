import { useMatches } from 'react-router-dom'
import { Bell, Menu } from 'lucide-react'
import { UserMenu } from './UserMenu'

/**
 * Reads the page title from route `handle` metadata, so the title stays
 * colocated with the route definition instead of being pushed up from
 * each page via context.
 */
function usePageTitle() {
  const matches = useMatches()
  // Deepest match wins, so nested routes can override their parent.
  const match = [...matches].reverse().find((entry) => entry.handle?.title)
  if (!match) return undefined

  const { title } = match.handle
  // A function lets dynamic routes derive the title from their params.
  return typeof title === 'function' ? title(match) : title
}

/**
 * @param {object} props
 * @param {() => void} props.onOpenMobileSidebar
 */
export function Topbar({ onOpenMobileSidebar }) {
  const title = usePageTitle()

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileSidebar}
        aria-label="Open navigation"
        className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-sunken hover:text-ink lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <h1 className="truncate text-lg font-semibold text-ink">{title}</h1>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <Bell className="size-5" aria-hidden="true" />
          {/* Static placeholder until notifications have a data source. */}
          <span
            className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger-solid ring-2 ring-surface"
            aria-hidden="true"
          />
        </button>

        <UserMenu />
      </div>
    </header>
  )
}
