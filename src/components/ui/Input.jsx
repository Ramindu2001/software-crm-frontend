import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * Labelled text field with hint and error support.
 *
 * Note: no `size` prop — <input> has a native `size` attribute (a number),
 * and shadowing it invites confusing bugs.
 *
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.hint] Helper text shown below the field.
 * @param {string} [props.error] Error message; also flips the field to invalid.
 * @param {React.ReactNode} [props.leadingIcon]
 * @param {string} [props.wrapperClassName] Targets the outer container.
 * @param {string} [props.className] Targets the <input> itself.
 */
export function Input({
  label,
  hint,
  error,
  leadingIcon,
  required,
  id,
  wrapperClassName,
  className,
  ...props
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`

  const hasError = Boolean(error)

  // Only reference ids that are actually rendered — the hint is replaced by
  // the error, so pointing at it while erroring would dangle.
  const describedBy =
    [hint && !hasError && hintId, hasError && errorId]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div className={cn('w-full', wrapperClassName)}>
      {label && (
        <label
          htmlFor={inputId}
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

      <div className="relative">
        {leadingIcon && (
          <span
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-subtle"
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        )}

        <input
          id={inputId}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-10 w-full rounded-lg bg-surface px-3 text-sm text-ink',
            'ring-1 ring-line transition-shadow',
            'placeholder:text-ink-subtle hover:ring-line-strong',
            'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-subtle',
            leadingIcon && 'pl-9',
            // Invalid fields get a red focus ring instead of the global brand
            // one — the focus state should agree with the error state.
            hasError &&
              'ring-danger-solid hover:ring-danger-solid focus-visible:outline-danger-solid',
            className,
          )}
          {...props}
        />
      </div>

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
