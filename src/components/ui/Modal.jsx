import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

/**
 * Accessible dialog.
 *
 * Rendered in a portal so ancestor overflow/z-index can never clip it — a
 * modal opened from inside a scrolling table would otherwise be trapped in
 * that container.
 *
 * Focus is trapped while open and restored to the trigger on close. Escape
 * and (optionally) backdrop clicks dismiss it.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {string} props.title Required — it is the dialog's accessible name.
 * @param {string} [props.description]
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {boolean} [props.closeOnBackdropClick]
 * @param {React.ReactNode} [props.footer] Action buttons.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  closeOnBackdropClick = true,
  footer,
  className,
  children,
  ...props
}) {
  const panelRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useFocusTrap(panelRef, isOpen)
  useEscapeKey(onClose, isOpen)
  useBodyScrollLock(isOpen)

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 animate-overlay-in bg-ink/40"
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        // Focusable so the trap has somewhere to place focus on open.
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[calc(100vh-2rem)] w-full flex-col',
          'animate-panel-in rounded-card bg-surface shadow-panel ring-1 ring-line',
          SIZES[size],
          className,
        )}
        {...props}
      >
        <div className="flex items-start gap-4 px-5 pt-5 pb-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-sunken hover:text-ink"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Only the body scrolls, so header and actions stay pinned. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 rounded-b-card border-t border-line bg-sunken px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
