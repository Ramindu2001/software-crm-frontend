import { useState } from 'react'
import { Ban, Info, Trophy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import { formatRupees } from '@/lib/format'
import { OPEN_STAGES } from '../constants'
import { LeadBoardCard } from './LeadBoardCard'

/**
 * The pipeline as columns, with drag-to-move.
 *
 * ── Why the board respects the API's invariants by construction ──
 * The backend allows a lead to be moved freely between open stages, but Won and
 * Lost are not stage changes: Won must write a customer record (and is a 409
 * through the status endpoint), Lost must record a reason (422 without one).
 * So the five open stages are columns you can drop into directly, and Won and
 * Lost are a separate bar that appears only while a card is in the air —
 * dropping there opens the dialog that collects what the server needs. Nothing
 * on this board can produce a request the API would reject.
 *
 * ── Why the close bar only appears mid-drag ──
 * Two permanent columns that never hold a card and exist only to be dropped on
 * would take a fifth of the board's width to do nothing most of the time.
 * Surfacing them exactly when they become meaningful keeps the board about
 * live work.
 *
 * ── Drag is not the only way ──
 * Native HTML5 drag-and-drop is a pointer gesture: no keyboard, and next to no
 * touch support. Every card therefore carries an actions menu offering the same
 * moves, and that menu — not the drag — is the accessible path. On a narrow
 * screen the list view is the better tool and the page defaults to it.
 */

const CLOSE_ZONES = [
  {
    key: 'won',
    icon: Trophy,
    label: 'Mark as won',
    hint: 'Creates the customer record',
    className: 'bg-success-soft text-success-strong ring-success-solid/30',
    activeClassName: 'ring-2 ring-success-solid bg-success-soft',
  },
  {
    key: 'lost',
    icon: Ban,
    label: 'Close as lost',
    hint: 'Needs a reason',
    className: 'bg-danger-soft text-danger-strong ring-danger-solid/30',
    activeClassName: 'ring-2 ring-danger-solid bg-danger-soft',
  },
]

function ColumnSkeleton() {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      <div className="h-8 animate-pulse rounded-lg bg-line" />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-lg bg-line/60" />
      ))}
    </div>
  )
}

/**
 * @param {object} props
 * @param {Record<string, Array>} props.columns Leads grouped by stage.
 * @param {boolean} props.isLoading
 * @param {boolean} props.isTruncated
 * @param {number} props.boardLimit
 * @param {number} props.total
 * @param {boolean} props.canManage
 * @param {boolean} props.canConvert
 * @param {object} props.on Action handlers, shared with the list view.
 */
export function LeadBoardView({
  columns,
  isLoading,
  isTruncated,
  boardLimit,
  total,
  canManage,
  canConvert,
  on,
}) {
  const [dragging, setDragging] = useState(null)
  /** Stage value, or a close-zone key, currently under the pointer. */
  const [dropTarget, setDropTarget] = useState(null)

  const endDrag = () => {
    setDragging(null)
    setDropTarget(null)
  }

  /**
   * dragover fires continuously, so the state write is guarded — without it
   * every frame of a drag would re-render the whole board.
   */
  const handleDragOver = (event, target) => {
    if (!dragging) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dropTarget !== target) setDropTarget(target)
  }

  const handleDropOnStage = (event, status) => {
    event.preventDefault()
    const lead = dragging
    endDrag()
    if (lead && lead.status !== status) on.moveStage(lead, status)
  }

  const handleDropOnClose = (event, zone) => {
    event.preventDefault()
    const lead = dragging
    endDrag()
    if (!lead) return
    zone === 'won' ? on.convert(lead) : on.closeLost(lead)
  }

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {OPEN_STAGES.map((stage) => (
          <ColumnSkeleton key={stage.value} />
        ))}
      </div>
    )
  }

  return (
    <>
      {isTruncated && (
        <Card className="mb-3">
          <CardContent className="flex items-start gap-2.5 p-3">
            <Info className="mt-0.5 size-4 shrink-0 text-info-strong" aria-hidden="true" />
            <p className="text-sm text-ink-muted">
              Showing the first {boardLimit} of {total} open leads. Narrow the
              board with a filter, or switch to the list view to page through
              all of them.
            </p>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <p className="sr-only">
          Cards can be dragged between stage columns. Each card also has an
          actions menu offering the same moves without a pointer.
        </p>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {OPEN_STAGES.map((stage) => {
          const leads = columns[stage.value] ?? []
          const isTarget = dropTarget === stage.value
          const isSource = dragging?.status === stage.value

          const columnValue = leads.reduce(
            (sum, lead) => sum + Number(lead.estimatedValue ?? 0),
            0,
          )

          return (
            <section
              key={stage.value}
              onDragOver={(event) => handleDragOver(event, stage.value)}
              onDrop={(event) => handleDropOnStage(event, stage.value)}
              aria-label={`${stage.label}, ${leads.length} leads`}
              className={cn(
                'flex w-72 shrink-0 flex-col rounded-card bg-sunken/70 transition-colors',
                // Only light up a column the card is not already in.
                isTarget && !isSource && 'bg-brand-50 ring-2 ring-brand-600',
              )}
            >
              <header className="flex items-baseline justify-between gap-2 px-3 pt-3 pb-2">
                <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink">
                  <span className="truncate">{stage.label}</span>
                  <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-xs tabular-nums text-ink-muted ring-1 ring-line">
                    {leads.length}
                  </span>
                </h3>
                {columnValue > 0 && (
                  <span className="shrink-0 text-xs tabular-nums text-ink-subtle">
                    {formatRupees(columnValue, { whole: true })}
                  </span>
                )}
              </header>

              <div className="flex min-h-24 flex-1 flex-col gap-2 p-2 pt-0">
                {leads.length === 0 ? (
                  <p
                    className={cn(
                      'grid flex-1 place-items-center rounded-lg border border-dashed border-line px-2 py-6 text-center text-xs text-ink-subtle',
                      isTarget && !isSource && 'border-brand-600 text-brand-700',
                    )}
                  >
                    {dragging ? 'Drop here' : 'Nothing at this stage'}
                  </p>
                ) : (
                  leads.map((lead) => (
                    <LeadBoardCard
                      key={lead.id}
                      lead={lead}
                      canManage={canManage}
                      canConvert={canConvert}
                      on={on}
                      isDragging={dragging?.leadId === lead.leadId}
                      onDragStart={setDragging}
                      onDragEnd={endDrag}
                    />
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>

      {/* Appears only with a card in the air — see the note at the top. */}
      {dragging && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="flex animate-panel-in gap-2 rounded-card bg-surface p-2 shadow-panel ring-1 ring-line">
            {CLOSE_ZONES.map((zone) => {
              const isTarget = dropTarget === zone.key

              return (
                <div
                  key={zone.key}
                  onDragOver={(event) => handleDragOver(event, zone.key)}
                  onDrop={(event) => handleDropOnClose(event, zone.key)}
                  className={cn(
                    'flex min-w-44 items-center gap-2.5 rounded-lg px-4 py-3 ring-1 transition-all',
                    zone.className,
                    isTarget && zone.activeClassName,
                  )}
                >
                  <zone.icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{zone.label}</span>
                    <span className="block text-xs opacity-80">{zone.hint}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
