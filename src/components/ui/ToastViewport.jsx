import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import {
  getToastsSnapshot,
  pauseToasts,
  resumeToasts,
  subscribeToasts,
} from '@/lib/toastStore'
import { Toast } from './Toast'

/**
 * Renders the toast stack. Mount once, above the router, so notifications
 * survive navigation — a "Signed out" toast has to outlive the redirect that
 * caused it.
 *
 * Portalled to body and above the modal layer, so a toast triggered from
 * inside a dialog is still visible.
 */
export function ToastViewport() {
  const toasts = useSyncExternalStore(subscribeToasts, getToastsSnapshot)

  if (toasts.length === 0) return null

  return createPortal(
    <div
      role="region"
      aria-label="Notifications"
      // Pausing on focus as well as hover: a keyboard user tabbing to the
      // dismiss button must not have the toast vanish underneath them.
      // React's onFocus/onBlur delegate to focusin/focusout, so these fire
      // for descendants too.
      onMouseEnter={pauseToasts}
      onMouseLeave={resumeToasts}
      onFocus={pauseToasts}
      onBlur={resumeToasts}
      // pointer-events-none on the container so the empty area above the
      // stack doesn't swallow clicks; each toast re-enables its own.
      className="pointer-events-none fixed right-0 bottom-0 z-[100] flex w-full flex-col gap-2 p-4 sm:max-w-96"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  )
}
