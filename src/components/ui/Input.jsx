import { cn } from '@/lib/utils'
import { Field, CONTROL_BASE, CONTROL_INVALID } from './Field'

/**
 * Labelled text field.
 *
 * Note: no `size` prop — <input> has a native `size` attribute (a number),
 * and shadowing it invites confusing bugs.
 *
 * @param {object} props
 * @param {string} [props.label]
 * @param {string} [props.hint]
 * @param {string} [props.error]
 * @param {React.ReactNode} [props.leadingIcon] Decorative; never interactive.
 * @param {React.ReactNode} [props.trailing] Interactive slot on the right,
 *   e.g. a password reveal toggle.
 * @param {string} [props.wrapperClassName] Targets the outer container.
 * @param {string} [props.className] Targets the <input> itself.
 */
export function Input({
  label,
  hint,
  error,
  leadingIcon,
  trailing,
  required,
  id,
  wrapperClassName,
  className,
  ...props
}) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={required}
      id={id}
      className={wrapperClassName}
    >
      {({ id: fieldId, describedBy, hasError }) => (
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
            id={fieldId}
            required={required}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            className={cn(
              CONTROL_BASE,
              'h-10 px-3',
              leadingIcon && 'pl-9',
              trailing && 'pr-10',
              hasError && CONTROL_INVALID,
              className,
            )}
            {...props}
          />

          {/* No pointer-events-none here: unlike leadingIcon, this slot is
              meant to be clickable. */}
          {trailing && (
            <span className="absolute inset-y-0 right-2 flex items-center">
              {trailing}
            </span>
          )}
        </div>
      )}
    </Field>
  )
}
