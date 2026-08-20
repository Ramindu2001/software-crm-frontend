import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LEAD_STATUS, OPEN_STAGES, stageRank } from '../constants'

/**
 * Where this lead is, and what comes next.
 *
 * ── What this replaces, and why ──
 * The stage used to be a bare `<select>`. Two things were wrong with that.
 *
 * First, a dropdown hides the pipeline. The stage list is a *sequence* — the
 * whole point of "Qualified" is that it comes after requirement gathering and
 * before a proposal — and a closed select renders that sequence as a single
 * word. A rep could not see how far along a lead was without opening it.
 *
 * Second, and worse, it fired the request on `change`. A native select that has
 * focus responds to arrow keys and, in some browsers, the scroll wheel: a stray
 * gesture while reading the page would silently move somebody's deal and pop a
 * success toast. Every stage here is a distinct labelled target that has to be
 * deliberately clicked, which removes the accident rather than apologising for
 * it afterwards.
 *
 * Won and Lost are deliberately not steps. Neither is reachable by a stage
 * change — Won writes a customer record, Lost records a reason — so both are
 * separate actions in the page header rather than steps that would 409 or 422
 * the moment they were pressed.
 */

/**
 * @param {object} props
 * @param {string} props.status Current stage.
 * @param {boolean} props.canManage
 * @param {boolean} props.isMoving Disables the row during a request.
 * @param {(status: string) => void} props.onMove
 */
export function LeadPipelineStepper({ status, canManage, isMoving, onMove }) {
  const currentRank = stageRank(status)

  return (
    <div>
      <ol className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {OPEN_STAGES.map((stage, index) => {
          const isCurrent = stage.value === status
          const isComplete = stage.rank < currentRank
          const isNext = stage.rank === currentRank + 1
          const isInteractive = canManage && !isCurrent

          const Element = isInteractive ? 'button' : 'div'

          return (
            <li key={stage.value} className="min-w-32 flex-1">
              <Element
                {...(isInteractive
                  ? {
                      type: 'button',
                      onClick: () => onMove(stage.value),
                      disabled: isMoving,
                      title: `Move to ${stage.label} — ${stage.hint}`,
                    }
                  : {})}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex w-full flex-col gap-1.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                  isInteractive && 'hover:bg-sunken disabled:pointer-events-none disabled:opacity-50',
                  isCurrent && 'bg-brand-50',
                )}
              >
                {/* The rail: filled behind the lead, hollow ahead of it, so the
                    shape of the row alone says how far along this is. */}
                <span
                  className={cn(
                    'h-1.5 w-full rounded-full transition-colors',
                    isComplete && 'bg-brand-300',
                    isCurrent && 'bg-brand-600',
                    !isComplete && !isCurrent && 'bg-line',
                    // The move a rep makes far more often than any other, so it
                    // gets a visible invitation rather than being one of four
                    // identical targets.
                    isNext && canManage && 'bg-line-strong',
                  )}
                />

                <span className="flex items-center gap-1.5">
                  {isComplete && (
                    <Check className="size-3 shrink-0 text-brand-600" aria-hidden="true" />
                  )}
                  <span
                    className={cn(
                      'truncate text-xs',
                      isCurrent
                        ? 'font-semibold text-brand-700'
                        : isComplete
                          ? 'text-ink-muted'
                          : 'text-ink-subtle',
                    )}
                  >
                    {stage.label}
                  </span>
                  {isNext && canManage && (
                    <span className="ml-auto shrink-0 text-[10px] font-medium tracking-wide text-ink-subtle uppercase">
                      Next
                    </span>
                  )}
                </span>

                {/* Index is only needed to keep the connector logic honest at
                    the ends; it carries no meaning for a reader. */}
                <span className="sr-only">{`Step ${index + 1} of ${OPEN_STAGES.length}`}</span>
              </Element>
            </li>
          )
        })}
      </ol>

      <p className="mt-1.5 px-2.5 text-xs text-ink-muted">
        {LEAD_STATUS[status]?.hint}
      </p>
    </div>
  )
}
