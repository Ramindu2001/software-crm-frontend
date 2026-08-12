import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * Native checkbox tinted to the brand palette.
 *
 * Deliberately not rebuilt with appearance-none: the native control already
 * has correct keyboard, focus and indeterminate behaviour, and accent-color
 * is enough to bring it into our design system.
 *
 * @param {object} props
 * @param {string} props.label
 * @param {string} [props.description] Secondary line under the label.
 */
export function Checkbox({
  label,
  description,
  id,
  className,
  wrapperClassName,
  ...props
}) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className={cn('flex items-start gap-2.5', wrapperClassName)}>
      <input
        type="checkbox"
        id={inputId}
        className={cn(
          'mt-0.5 size-4 shrink-0 cursor-pointer rounded accent-brand-600',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />

      <div className="min-w-0">
        <label
          htmlFor={inputId}
          className="cursor-pointer text-sm text-ink select-none"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-ink-muted">{description}</p>
        )}
      </div>
    </div>
  )
}
