import { useId } from 'react'
import { cn } from '@/lib/utils'

/** Shared control chrome, so Input/Select/Textarea can never drift apart. */
export const CONTROL_BASE =
  'w-full rounded-lg bg-surface text-sm text-ink ring-1 ring-line transition-shadow ' +
  'placeholder:text-ink-subtle hover:ring-line-strong ' +
  'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-subtle'

/** Invalid fields get a red focus ring so focus and validity never disagree. */
export const CONTROL_INVALID =
  'ring-danger-solid hover:ring-danger-solid focus-visible:outline-danger-solid'

/**
 * Label + control + hint/error scaffolding.
 *
 * Owns the id generation and ARIA wiring for every form control, so the
 * accessibility contract is implemented once rather than re-derived (and
 * re-broken) in each field component.
 *
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.hint]
 * @param {string} [props.error] Presence flips the control to invalid.
 * @param {boolean} [props.required]
 * @param {string} [props.id] Override the generated id.
 * @param {(bag: {id: string, describedBy?: string, hasError: boolean}) => React.ReactNode} props.children
 */
export function Field({
  label,
  hint,
  error,
  required,
  id: idProp,
  className,
  children,
}) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const hasError = Boolean(error)

  // Only reference ids that are actually rendered — the hint is replaced by
  // the error, so pointing at it while erroring would dangle.
  const describedBy =
    [hint && !hasError && hintId, hasError && errorId]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-danger-solid" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {children({ id, describedBy, hasError })}

      {hint && !hasError && (
        <p id={hintId} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      )}

      {hasError && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger-strong">
          {error}
        </p>
      )}
    </div>
  )
}
