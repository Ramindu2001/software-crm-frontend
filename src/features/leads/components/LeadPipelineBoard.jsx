import { AlarmClock, CalendarClock, CalendarOff, Wallet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import { formatRupees } from '@/lib/format'
import { LEAD_STATUS } from '../constants'

/**
 * The pipeline at a glance.
 *
 * Two rows, answering two different questions:
 *
 *   1. What needs doing today?   overdue / due today / never scheduled
 *   2. What is in the pipeline?  a count per stage, plus open value
 *
 * The follow-up tiles come first because they are the only ones that are
 * actionable — a stage count tells you the shape of the funnel, but an overdue
 * follow-up is somebody waiting for a call. Each is a button that applies the
 * matching filter to the table below, so the number is a way in rather than
 * just a number.
 *
 * "Never scheduled" earns its tile: an open lead with no follow-up date is
 * invisible in every date-based view, which is exactly how leads get dropped.
 */

function FollowUpTile({ icon: Icon, label, value, tone, isActive, onClick }) {
  const TONES = {
    danger: 'text-danger-strong bg-danger-soft',
    warning: 'text-warning-strong bg-warning-soft',
    neutral: 'text-neutral-strong bg-neutral-soft',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        'flex items-center gap-3 rounded-card bg-surface p-4 text-left ring-1 transition-shadow',
        'hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        isActive ? 'ring-2 ring-brand-600' : 'ring-line',
      )}
    >
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', TONES[tone])}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-semibold tabular-nums text-ink">{value}</span>
        <span className="block truncate text-xs text-ink-muted">{label}</span>
      </span>
    </button>
  )
}

/**
 * @param {object} props
 * @param {object} props.stats From useLeadStats.
 * @param {string} props.activeFollowUp Current follow-up filter value.
 * @param {(value: string) => void} props.onFollowUpChange Toggles the filter.
 * @param {string} props.activeStatus
 * @param {(value: string) => void} props.onStatusChange
 */
export function LeadPipelineBoard({
  stats,
  activeFollowUp,
  onFollowUpChange,
  activeStatus,
  onStatusChange,
}) {
  // Clicking the tile that is already applied clears it, so the board never
  // traps the user in a filter they have to hunt for a way out of.
  const toggle = (current, value, apply) => apply(current === value ? '' : value)

  const stages = Object.values(LEAD_STATUS).sort((a, b) => a.rank - b.rank)

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FollowUpTile
          icon={AlarmClock}
          tone="danger"
          label="Follow-ups overdue"
          value={stats.followUps.overdue}
          isActive={activeFollowUp === 'overdue'}
          onClick={() => toggle(activeFollowUp, 'overdue', onFollowUpChange)}
        />
        <FollowUpTile
          icon={CalendarClock}
          tone="warning"
          label="Due today"
          value={stats.followUps.dueToday}
          isActive={activeFollowUp === 'today'}
          onClick={() => toggle(activeFollowUp, 'today', onFollowUpChange)}
        />
        <FollowUpTile
          icon={CalendarOff}
          tone="neutral"
          label="Open, never scheduled"
          value={stats.followUps.unscheduled}
          isActive={activeFollowUp === 'unscheduled'}
          onClick={() => toggle(activeFollowUp, 'unscheduled', onFollowUpChange)}
        />

        {/* Not a filter — there is no "leads worth money" query to run, so this
            one is a plain figure rather than a button that would do nothing. */}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
              <Wallet className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xl font-semibold tabular-nums text-ink">
                {formatRupees(stats.openValue, { whole: true })}
              </span>
              <span className="block truncate text-xs text-ink-muted">
                Open pipeline · {stats.openTotal} live
              </span>
            </span>
          </CardContent>
        </Card>
      </div>

      {/* The funnel. Horizontal scroll rather than wrapping, so the stage order
          — which is the whole meaning of the row — survives a narrow screen. */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-2">
          {stages.map((stage) => {
            const isActive = activeStatus === stage.value
            return (
              <button
                key={stage.value}
                type="button"
                onClick={() => toggle(activeStatus, stage.value, onStatusChange)}
                aria-pressed={isActive}
                title={stage.hint}
                className={cn(
                  'flex min-w-32 flex-1 flex-col gap-0.5 rounded-lg bg-surface px-3 py-2.5 text-left ring-1 transition-shadow',
                  'hover:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                  isActive ? 'ring-2 ring-brand-600' : 'ring-line',
                )}
              >
                <span className="text-lg font-semibold tabular-nums text-ink">
                  {stats.byStatus[stage.value] ?? 0}
                </span>
                <span className="truncate text-xs text-ink-muted">{stage.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
