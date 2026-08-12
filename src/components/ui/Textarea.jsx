import { cn } from '@/lib/utils'
import { Field, CONTROL_BASE, CONTROL_INVALID } from './Field'

/**
 * Labelled multi-line text field.
 *
 * @param {object} props
 * @param {number} [props.rows]
 * @param {string} [props.wrapperClassName]
 */
export function Textarea({
  label,
  hint,
  error,
  rows = 4,
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
        <textarea
          id={fieldId}
          rows={rows}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          className={cn(
            CONTROL_BASE,
            'resize-y px-3 py-2 leading-relaxed',
            hasError && CONTROL_INVALID,
            className,
          )}
          {...props}
        />
      )}
    </Field>
  )
}
