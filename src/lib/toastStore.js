/**
 * Framework-agnostic toast store.
 *
 * Deliberately not React Context: apiClient's error handler is not a component
 * and cannot call hooks, so notifications have to be triggerable from plain
 * functions. React subscribes through useSyncExternalStore instead.
 *
 * Living in lib/ keeps it at the bottom of the dependency chain, so app/,
 * features/ and components/ can all import it without inverting direction.
 */

/** How long the leave animation runs before the toast is actually removed. */
export const TOAST_LEAVE_MS = 160

/** Errors linger; confirmations get out of the way. */
const DEFAULT_DURATIONS = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
}

/** Beyond this the stack becomes a wall — oldest are dropped. */
const MAX_VISIBLE = 4

let toasts = []
let nextId = 0
let isPaused = false

const listeners = new Set()
/** id -> { timeoutId, expiresAt, remaining } — auto-dismiss countdown. */
const timers = new Map()
/**
 * id -> timeoutId for the pending removal after a leave animation.
 *
 * Tracked rather than fired and forgotten: an untracked removal keeps running
 * after the toast is gone, and could land on an unrelated toast that happened
 * to reuse the id.
 */
const leaveTimers = new Map()

function notify() {
  for (const listener of listeners) listener()
}

export function subscribeToasts(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Must stay referentially stable between changes or useSyncExternalStore will
 * re-render forever — hence reassigning `toasts` rather than mutating it.
 */
export function getToastsSnapshot() {
  return toasts
}

function clearTimer(id) {
  const timer = timers.get(id)
  if (timer?.timeoutId) clearTimeout(timer.timeoutId)
  timers.delete(id)

  const leaveTimer = leaveTimers.get(id)
  if (leaveTimer) clearTimeout(leaveTimer)
  leaveTimers.delete(id)
}

function schedule(id, duration) {
  if (!Number.isFinite(duration)) return

  if (isPaused) {
    // Arrived while the user is reading the stack — hold it until they leave.
    timers.set(id, { timeoutId: null, remaining: duration })
    return
  }

  timers.set(id, {
    timeoutId: setTimeout(() => dismissToast(id), duration),
    expiresAt: Date.now() + duration,
  })
}

function remove(id) {
  clearTimer(id)
  toasts = toasts.filter((toast) => toast.id !== id)
  notify()
}

/**
 * Begins the leave animation, then removes.
 *
 * Two-phase so the toast can animate out — the alternative is elements
 * disappearing mid-read, which is exactly what makes a toast feel broken.
 */
export function dismissToast(id) {
  const existing = toasts.find((toast) => toast.id === id)
  if (!existing || existing.leaving) return

  clearTimer(id)
  toasts = toasts.map((toast) =>
    toast.id === id ? { ...toast, leaving: true } : toast,
  )
  notify()

  leaveTimers.set(id, setTimeout(() => remove(id), TOAST_LEAVE_MS))
}

export function dismissAllToasts() {
  for (const toast of toasts) dismissToast(toast.id)
}

/**
 * Pause auto-dismiss while the user is reading (hover or keyboard focus).
 * WCAG 2.2.1 — a message that disappears on a timer must be pausable.
 */
export function pauseToasts() {
  if (isPaused) return
  isPaused = true

  for (const timer of timers.values()) {
    if (!timer.timeoutId) continue
    clearTimeout(timer.timeoutId)
    timer.remaining = Math.max(0, timer.expiresAt - Date.now())
    timer.timeoutId = null
  }
}

export function resumeToasts() {
  if (!isPaused) return
  isPaused = false

  for (const [id, timer] of timers.entries()) {
    const remaining = timer.remaining ?? 0
    timer.timeoutId = setTimeout(() => dismissToast(id), remaining)
    timer.expiresAt = Date.now() + remaining
    timer.remaining = undefined
  }
}

function push({ tone = 'info', title, description, duration, key }) {
  // Deduplicate by key: a burst of identical network errors should refresh one
  // toast, not stack five.
  if (key) {
    const existing = toasts.find(
      (toast) => toast.key === key && !toast.leaving,
    )
    if (existing) {
      toasts = toasts.map((toast) =>
        toast.id === existing.id ? { ...toast, title, description } : toast,
      )
      clearTimer(existing.id)
      schedule(existing.id, duration ?? DEFAULT_DURATIONS[tone])
      notify()
      return existing.id
    }
  }

  const id = ++nextId
  toasts = [...toasts, { id, tone, title, description, key, leaving: false }]

  // Drop the oldest immediately rather than animating — they are already gone
  // from view by the time the cap is hit.
  while (toasts.length > MAX_VISIBLE) {
    const oldest = toasts[0]
    clearTimer(oldest.id)
    toasts = toasts.slice(1)
  }

  schedule(id, duration ?? DEFAULT_DURATIONS[tone])
  notify()
  return id
}

/**
 * Trigger a notification from anywhere — component or not.
 *
 * @example toast.success('Issue created', { description: 'SYN-1043' })
 */
export const toast = {
  success: (title, options) => push({ ...options, tone: 'success', title }),
  error: (title, options) => push({ ...options, tone: 'error', title }),
  warning: (title, options) => push({ ...options, tone: 'warning', title }),
  info: (title, options) => push({ ...options, tone: 'info', title }),
  dismiss: dismissToast,
  dismissAll: dismissAllToasts,
}

/**
 * Test seam.
 *
 * `nextId` is deliberately NOT reset: ids must stay unique for the module's
 * lifetime, or a removal already scheduled for a dismissed toast could land on
 * a later one that reused its id.
 */
export function resetToasts() {
  for (const id of [...timers.keys(), ...leaveTimers.keys()]) clearTimer(id)
  toasts = []
  isPaused = false
  notify()
}
