import { Spinner } from '@/components/ui'

/**
 * Suspense fallback for lazily loaded routes.
 *
 * Sits inside the layout, so the sidebar and topbar stay painted while a
 * route chunk downloads. role="status" announces the wait without stealing
 * focus from wherever the user was.
 */
export function RouteFallback() {
  return (
    <div
      role="status"
      className="flex min-h-64 items-center justify-center gap-2 text-ink-subtle"
    >
      <Spinner className="size-5" />
      <span className="text-sm">Loading…</span>
    </div>
  )
}
