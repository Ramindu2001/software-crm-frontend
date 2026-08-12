import { cn } from '@/lib/utils'
import { Card } from '@/components/ui'

/**
 * Placeholder for a view with no data yet.
 *
 * @param {object} props
 * @param {React.ElementType} [props.icon] A lucide icon component.
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.action]
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}) {
  return (
    <Card
      className={cn('flex flex-col items-center px-6 py-14 text-center', className)}
      {...props}
    >
      {Icon && (
        <div className="mb-4 grid size-11 place-items-center rounded-full bg-sunken text-ink-subtle">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  )
}
