import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Field, CONTROL_BASE, CONTROL_INVALID } from './Field'

/**
 * Labelled dropdown built on a native <select>.
 *
 * Native rather than a custom listbox: it gets keyboard support, mobile
 * pickers and screen reader semantics for free. A custom control only earns
 * its complexity when we need multi-select or rich option rendering.
 *
 * @param {object} props
 * @param {Array<{value: string, label: string}>} props.options
 * @param {string} [props.placeholder] Rendered as an empty-value option.
 * @param {string} [props.wrapperClassName]
 */
export function Select({
  label,
  hint,
  error,
  options = [],
  placeholder,
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
          <select
            id={fieldId}
            required={required}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            className={cn(
              CONTROL_BASE,
              // appearance-none removes the platform arrow so ours can align
              // with the rest of the design system.
              'h-10 appearance-none py-0 pl-3 pr-9',
              hasError && CONTROL_INVALID,
              className,
            )}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
            aria-hidden="true"
          />
        </div>
      )}
    </Field>
  )
}
