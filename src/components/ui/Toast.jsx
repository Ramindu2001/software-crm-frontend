import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dismissToast } from '@/lib/toastStore'

const TONES = {
  success: {
    icon: CircleCheck,
    iconClass: 'text-success-solid',
    accent: 'border-l-success-solid',
  },
  error: {
    icon: CircleX,
    iconClass: 'text-danger-solid',
    accent: 'border-l-danger-solid',
  },
  warning: {
    icon: TriangleAlert,
    iconClass: 'text-warning-solid',
    accent: 'border-l-warning-solid',
  },
  info: {
    icon: Info,
    iconClass: 'text-info-solid',
    accent: 'border-l-info-solid',
  },
}

/**
 * A single notification.
 *
 * Neutral surface with a tone-coloured accent and icon, rather than a fully
 * tinted panel — four saturated blocks stacked in a corner is visual noise,
 * and the accent alone reads the tone instantly.
 *
 * @param {object} props
 * @param {{id: number, tone: string, title: string, description?: string,
 *   leaving?: boolean}} props.toast
 */
export function Toast({ toast }) {
  const { icon: Icon, iconClass, accent } = TONES[toast.tone] ?? TONES.info

  return (
    <div
      // Errors interrupt; everything else waits its turn.
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3',
        'rounded-card border-l-4 bg-surface py-3 pr-3 pl-3.5',
        'shadow-panel ring-1 ring-line',
        accent,
        toast.leaving ? 'animate-toast-out' : 'animate-toast-in',
      )}
    >
      <Icon className={cn('mt-0.5 size-4.5 shrink-0', iconClass)} aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-sm text-ink-muted">{toast.description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label="Dismiss notification"
        className="-mt-0.5 -mr-0.5 shrink-0 rounded-md p-1 text-ink-subtle transition-colors hover:bg-sunken hover:text-ink"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
