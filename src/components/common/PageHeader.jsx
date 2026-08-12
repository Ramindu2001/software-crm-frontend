import { cn } from '@/lib/utils'

/**
 * Description + action bar sitting above page content.
 *
 * Deliberately renders no title: the Topbar already provides the page <h1>
 * from route metadata, and a second competing heading muddies the hierarchy.
 *
 * @param {object} props
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.actions] Usually one primary Button.
 */
export function PageHeader({ description, actions, className, ...props }) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-center justify-between gap-3',
        className,
      )}
      {...props}
    >
      {description && (
        <p className="max-w-prose text-sm text-ink-muted">{description}</p>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  )
}
