import { cn } from '@/lib/utils'

/**
 * Surface container. Compose with the sub-components below rather than
 * passing title/footer props — real layouts outgrow prop-driven cards fast.
 *
 * @param {object} props
 * @param {boolean} [props.interactive] Adds hover elevation for clickable cards.
 */
export function Card({ interactive = false, className, children, ...props }) {
  return (
    <div
      className={cn(
        // ring instead of border: no box-model space, so sibling layout
        // never shifts when a card gains or loses its outline.
        'rounded-card bg-surface shadow-card ring-1 ring-line',
        interactive &&
          'cursor-pointer transition-shadow hover:shadow-panel hover:ring-line-strong',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('px-5 pt-5 pb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ as: Component = 'h3', className, children, ...props }) {
  return (
    <Component
      className={cn('text-base font-semibold text-ink', className)}
      {...props}
    >
      {children}
    </Component>
  )
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('mt-1 text-sm text-ink-muted', className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('px-5 pb-5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-b-card border-t border-line bg-sunken px-5 py-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
