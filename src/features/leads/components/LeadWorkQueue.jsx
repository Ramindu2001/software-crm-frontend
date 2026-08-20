import { AlarmClock, CalendarClock, CalendarOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import { formatRupees } from '@/lib/format'
import { LEAD_STATUS } from '../constants'

/**
 * What needs doing, and what the pipeline looks like.
 *
 * ── What changed, and why ──
 * This replaces a board of eleven equally-weighted clickable tiles that
 * competed with a filter bar controlling the same state. Two specific problems
 * are fixed here:
 *
 * 1. Stage and follow-up each now have exactly ONE control. Previously the
 *    stage tiles and the status dropdown both wrote `filters.status`, so
 *    setting one silently moved the other and neither looked authoritative.
 *    Stage lives in the strip below; follow-up lives in the chips above; the
 *    filter bar owns neither.
 *
 * 2. The open-value figure is no longer dressed as a tile. It used to be a
 *    Card identical to the three beside it but inert on click, because there is
 *    no "leads worth money" query to run. Same information, rendered as the
 *    readout it actually is.
 *
 * A count of zero disables its filter rather than hiding it: "no overdue
 * follow-ups" is worth seeing, and a chip that filters to an empty table is a
 * dead end somebody has to back out of.
 */

const QUEUE_TONES = {
  danger: {
    idle: 'text-danger-strong bg-danger-soft',
    active: 'ring-2 ring-danger-solid',
  },
  warning: {
    idle: 'text-warning-strong bg-warning-soft',
    active: 'ring-2 ring-warning-solid',
  },
  neutral: {
    idle: 'text-neutral-strong bg-neutral-soft',
    active: 'ring-2 ring-neutral-solid',
  },
}

function QueueChip({ icon: Icon, label, value, tone, isActive, onClick }) {
  const isEmpty = value === 0
  const tones = QUEUE_TONES[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isEmpty}
      aria-pressed={isActive}
      className={cn(
        'flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all',
        'ring-1 ring-line hover:ring-line-strong',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        // Nothing to see and nothing to click — but still readable, because
        // "zero overdue" is a result, not an absence of information.
        isEmpty && 'pointer-events-none opacity-55',
        isActive && tones.active,
      )}
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-lg',
          tones.idle,
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xl leading-tight font-semibold tabular-nums text-ink">
          {value}
        </span>
        <span className="block truncate text-xs text-ink-muted">{label}</span>
      </span>
    </button>
  )
}

/**
 * The funnel, as one compact row of stage pills.
 *
 * This is the only stage filter in the module. Each pill shows its count so the
 * shape of the funnel is readable at a glance, and clicking one filters the
 * view below; clicking the applied one clears it, so the strip can never trap
 * somebody in a filter they then have to hunt for a way out of.
 */
function StageStrip({ counts, activeStatus, onStatusChange }) {
  const stages = Object.values(LEAD_STATUS).sort((a, b) => a.rank - b.rank)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {stages.map((stage) => {
        const count = counts[stage.value] ?? 0
        const isActive = activeStatus === stage.value

        return (
          <button
            key={stage.value}
            type="button"
            title={stage.hint}
            aria-pressed={isActive}
            onClick={() => onStatusChange(isActive ? '' : stage.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
              isActive
                ? 'bg-brand-600 text-ink-inverse'
                : 'text-ink-muted hover:bg-sunken hover:text-ink',
              count === 0 && !isActive && 'opacity-55',
            )}
          >
            <span className="font-semibold tabular-nums">{count}</span>
            <span>{stage.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * @param {object} props
 * @param {object} props.stats From useLeadStats.
 * @param {string} props.activeFollowUp
 * @param {(value: string) => void} props.onFollowUpChange
 * @param {string} props.activeStatus
 * @param {(value: string) => void} props.onStatusChange
 */
export function LeadWorkQueue({
  stats,
  activeFollowUp,
  onFollowUpChange,
  activeStatus,
  onStatusChange,
}) {
  const toggleFollowUp = (value) =>
    onFollowUpChange(activeFollowUp === value ? '' : value)

  return (
    <Card className="mb-4">
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <QueueChip
              icon={AlarmClock}
              tone="danger"
              label="Overdue"
              value={stats.followUps.overdue}
              isActive={activeFollowUp === 'overdue'}
              onClick={() => toggleFollowUp('overdue')}
            />
            <QueueChip
              icon={CalendarClock}
              tone="warning"
              label="Due today"
              value={stats.followUps.dueToday}
              isActive={activeFollowUp === 'today'}
              onClick={() => toggleFollowUp('today')}
            />
            {/* Earns its place: an open lead nobody has diarised is invisible
                in every date-based view, which is how leads get dropped. */}
            <QueueChip
              icon={CalendarOff}
              tone="neutral"
              label="No follow-up set"
              value={stats.followUps.unscheduled}
              isActive={activeFollowUp === 'unscheduled'}
              onClick={() => toggleFollowUp('unscheduled')}
            />
          </div>

          {/* A readout, not a control — deliberately not shaped like the chips. */}
          <div className="shrink-0 border-line lg:border-l lg:pl-5 lg:text-right">
            <p className="text-xl leading-tight font-semibold tabular-nums text-ink">
              {formatRupees(stats.openValue, { whole: true })}
            </p>
            <p className="text-xs text-ink-muted">
              Open pipeline · {stats.openTotal} live
            </p>
          </div>
        </div>

        <div className="border-t border-line pt-3">
          <StageStrip
            counts={stats.byStatus}
            activeStatus={activeStatus}
            onStatusChange={onStatusChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
