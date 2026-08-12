import { Spinner } from '@/components/ui'

/**
 * Full-viewport loading state, used while the stored session is being checked.
 *
 * Without this window the app would flash the login screen on every refresh
 * before the session resolves.
 */
export function FullPageLoader({ label = 'Loading…' }) {
  return (
    <div
      role="status"
      className="grid min-h-screen place-items-center bg-canvas"
    >
      <div className="flex items-center gap-2 text-ink-subtle">
        <Spinner className="size-5" />
        <span className="text-sm">{label}</span>
      </div>
    </div>
  )
}
