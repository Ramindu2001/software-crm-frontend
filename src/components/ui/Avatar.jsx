import { cn } from '@/lib/utils'

const SIZES = {
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
}

/**
 * Initials avatar.
 *
 * Decorative by default — callers render the person's name alongside it.
 * Pass `label` when the avatar stands alone and needs its own accessible name.
 *
 * @param {object} props
 * @param {string} props.initials
 * @param {string} [props.label] Accessible name; omit when a name is adjacent.
 * @param {'sm'|'md'|'lg'} [props.size]
 */
export function Avatar({ initials, label, size = 'md', className, ...props }) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700',
        SIZES[size],
        className,
      )}
      {...props}
    >
      {initials}
    </span>
  )
}
