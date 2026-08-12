import { cn } from '@/lib/utils'

const BASE =
  'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap ' +
  'transition-colors select-none ' +
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50'

const VARIANTS = {
  primary: 'bg-brand-600 text-ink-inverse hover:bg-brand-700 active:bg-brand-800',
  secondary:
    'bg-surface text-ink ring-1 ring-line hover:bg-sunken active:bg-line',
  ghost: 'text-ink-muted hover:bg-sunken hover:text-ink active:bg-line',
  danger:
    'bg-danger-solid text-ink-inverse hover:bg-danger-strong active:bg-danger-strong',
}

const SIZES = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-11 gap-2 px-5 text-sm',
}

function Spinner() {
  return (
    <svg
      className="size-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}

/**
 * Primary interactive control.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'} [props.variant]
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {boolean} [props.isLoading] Shows a spinner and blocks interaction.
 * @param {boolean} [props.fullWidth]
 * @param {React.ElementType} [props.as] Render as another element (e.g. 'a').
 */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  as: Component = 'button',
  className,
  children,
  disabled,
  type,
  ...props
}) {
  const isInactive = disabled || isLoading
  const isNativeButton = Component === 'button'

  return (
    <Component
      // `type` is only meaningful on a real <button>; on an <a> it would be
      // read as a MIME type hint.
      {...(isNativeButton
        ? { type: type ?? 'button', disabled: isInactive }
        : { 'aria-disabled': isInactive || undefined })}
      aria-busy={isLoading || undefined}
      className={cn(
        BASE,
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {isLoading && <Spinner />}
      {children}
    </Component>
  )
}
