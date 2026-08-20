import { Link } from 'react-router-dom'
import { GripVertical, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate, formatRupees } from '@/lib/format'
import { Avatar, Badge } from '@/components/ui'
import { followUpUrgency } from '../constants'
import { SolutionTypeBadge } from './LeadBadges'
import { LeadMenu } from './LeadMenu'
import { buildLeadMenuItems } from './leadActions'

/**
 * One lead, as a card on the pipeline board.
 *
 * Draggable when the user may manage leads, and inert when they may not —
 * a card that lifts off the column and then refuses to land is a worse
 * experience than one that never moved.
 *
 * The grip handle is decorative: the whole card is the drag source, and the
 * handle exists so that the card *looks* draggable at rest. Dragging is a
 * pointer gesture only, so every move it can perform is also in the actions
 * menu — that menu is the keyboard and touch path, not a fallback nobody
 * thought about.
 */

/**
 * @param {object} props
 * @param {object} props.lead
 * @param {boolean} props.canManage
 * @param {boolean} props.canConvert
 * @param {object} props.on Action handlers.
 * @param {boolean} props.isDragging
 * @param {(lead: object) => void} props.onDragStart
 * @param {() => void} props.onDragEnd
 */
export function LeadBoardCard({
  lead,
  canManage,
  canConvert,
  on,
  isDragging,
  onDragStart,
  onDragEnd,
}) {
  const urgency = followUpUrgency(lead.nextFollowUpOn)

  const menuItems = buildLeadMenuItems({ lead, canManage, canConvert, on })

  return (
    <article
      draggable={canManage}
      onDragStart={(event) => {
        // Some browsers refuse to start a drag without payload on the transfer.
        event.dataTransfer.setData('text/plain', String(lead.id))
        event.dataTransfer.effectAllowed = 'move'
        onDragStart(lead)
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'group rounded-lg bg-surface p-3 ring-1 ring-line transition-shadow',
        canManage && 'cursor-grab active:cursor-grabbing',
        'hover:shadow-card hover:ring-line-strong',
        // Left in place but faded, so the column does not reflow under the
        // pointer mid-drag and change where the drop is going to land.
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-1.5">
        {canManage && (
          <GripVertical
            className="mt-0.5 size-4 shrink-0 text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
        )}

        <div className="min-w-0 flex-1">
          <Link
            to={`/leads/${lead.id}`}
            // The card is a drag source; without this a click-drag on the link
            // starts a native link drag instead of the card drag.
            draggable={false}
            className="block truncate text-sm font-medium text-ink transition-colors hover:text-brand-700"
          >
            {lead.contactName}
          </Link>
          {lead.companyName && (
            <p className="truncate text-xs text-ink-subtle">{lead.companyName}</p>
          )}
        </div>

        <LeadMenu
          label={`Actions for ${lead.contactName}`}
          items={menuItems}
          className="-mt-1 -mr-1 size-7"
        />
      </div>

      <a
        href={`tel:${lead.phone.replace(/\s/g, '')}`}
        draggable={false}
        onClick={(event) => event.stopPropagation()}
        className="mt-2 inline-flex items-center gap-1 text-xs text-ink-subtle transition-colors hover:text-brand-700"
      >
        <Phone className="size-3" aria-hidden="true" />
        {lead.phone}
      </a>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {/* Undecided is the default and says nothing worth a badge. */}
        {lead.solutionType !== 'Undecided' && (
          <SolutionTypeBadge solutionType={lead.solutionType} size="sm" />
        )}
        {urgency && (
          <Badge tone={urgency.tone} size="sm">
            {urgency.label}
          </Badge>
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
        <span className="truncate text-xs tabular-nums text-ink-muted">
          {lead.estimatedValue == null
            ? 'No value set'
            : formatRupees(lead.estimatedValue, { whole: true })}
        </span>

        <span className="flex shrink-0 items-center gap-1.5">
          {lead.nextFollowUpOn && !urgency && (
            <time
              dateTime={lead.nextFollowUpOn}
              className="text-xs whitespace-nowrap text-ink-subtle"
            >
              {formatDate(lead.nextFollowUpOn)}
            </time>
          )}
          {lead.owner ? (
            <Avatar
              initials={lead.owner.initials}
              size="sm"
              label={`Owned by ${lead.owner.name}`}
            />
          ) : (
            <span className="text-xs text-ink-subtle italic">Unassigned</span>
          )}
        </span>
      </div>
    </article>
  )
}
