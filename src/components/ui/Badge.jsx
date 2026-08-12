import { cn } from '@/lib/utils'

const BASE =
  'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap'

const TONES = {
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success-soft text-success-strong',
  warning: 'bg-warning-soft text-warning-strong',
  danger: 'bg-danger-soft text-danger-strong',
  info: 'bg-info-soft text-info-strong',
  neutral: 'bg-neutral-soft text-neutral-strong',
}

const DOT_TONES = {
  brand: 'bg-brand-600',
  success: 'bg-success-solid',
  warning: 'bg-warning-solid',
  danger: 'bg-danger-solid',
  info: 'bg-info-solid',
  neutral: 'bg-neutral-solid',
}

const SIZES = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
}

/**
 * Status / metadata label.
 *
 * @param {object} props
 * @param {'brand'|'success'|'warning'|'danger'|'info'|'neutral'} [props.tone]
 * @param {'sm'|'md'} [props.size]
 * @param {boolean} [props.dot] Render a leading status dot.
 */
export function Badge({
  tone = 'neutral',
  size = 'md',
  dot = false,
  className,
  children,
  ...props
}) {
  return (
    <span
      className={cn(BASE, TONES[tone], SIZES[size], className)}
      {...props}
    >
      {dot && (
        <span
          className={cn('size-1.5 rounded-full', DOT_TONES[tone])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
