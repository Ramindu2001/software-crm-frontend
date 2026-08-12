import { cn } from '@/lib/utils'
import { APP_NAME } from '@/config/constants'

const STATUSES = [
  { label: 'Critical', tone: 'danger' },
  { label: 'High', tone: 'warning' },
  { label: 'In Progress', tone: 'info' },
  { label: 'Resolved', tone: 'success' },
  { label: 'Closed', tone: 'neutral' },
]

const TONE_STYLES = {
  danger: 'bg-danger-soft text-danger-strong',
  warning: 'bg-warning-soft text-warning-strong',
  info: 'bg-info-soft text-info-strong',
  success: 'bg-success-soft text-success-strong',
  neutral: 'bg-neutral-soft text-neutral-strong',
}

function App() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-md rounded-card bg-surface p-8 shadow-card ring-1 ring-line">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          {APP_NAME}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">
          Architecture online
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Path aliases resolving, design tokens compiling.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {STATUSES.map(({ label, tone }) => (
            <span
              key={label}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium',
                TONE_STYLES[tone],
              )}
            >
              {label}
            </span>
          ))}
        </div>

        <button
          type="button"
          className={cn(
            'mt-8 w-full rounded-lg px-4 py-2.5 text-sm font-medium',
            'bg-brand-600 text-ink-inverse transition-colors hover:bg-brand-700',
          )}
        >
          Primary action
        </button>
      </div>
    </main>
  )
}

export default App
