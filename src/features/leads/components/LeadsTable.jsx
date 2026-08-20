import { Link, useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronsUpDown, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate, formatRupees } from '@/lib/format'
import { Avatar, Badge, Card } from '@/components/ui'
import { followUpUrgency } from '../constants'
import { LeadStatusBadge, SolutionTypeBadge } from './LeadBadges'
import { LeadMenu } from './LeadMenu'
import { buildLeadMenuItems } from './leadActions'

/**
 * The pipeline as rows — and, on a narrow screen, as cards.
 *
 * ── What changed, and why ──
 * · Sort affordances are visible at rest. They used to be `opacity-0` until
 *   hover, which meant a touch user could never discover that the table sorted
 *   at all, and a mouse user had to sweep the header to find out which four of
 *   the six columns did anything.
 * · The nested scroll container is gone. A `max-h` region inside a scrolling
 *   page gives you two scrollbars racing each other, and the sticky header it
 *   bought is not worth that.
 * · Below `md` the table becomes a list of cards. It previously stayed a table
 *   with a 3xl minimum width, so a phone showed three of six columns and a
 *   horizontal scrollbar.
 * · Every row carries the actions menu, so logging a call no longer means
 *   navigating to the lead and back.
 */

/**
 * `sortable: false` marks a column the API will not order by — owner and
 * solution are joined or unlisted in the backend's allowlist, and sending them
 * would come back 400 rather than sorted.
 */
const COLUMNS = [
  { key: 'contactName', label: 'Contact' },
  { key: 'status', label: 'Stage', width: 'w-40' },
  { key: 'nextFollowUp', label: 'Follow-up', width: 'w-44' },
  {
    key: 'solutionType',
    label: 'Solution',
    width: 'w-40',
    responsive: 'hidden xl:table-cell',
    sortable: false,
  },
  {
    key: 'estimatedValue',
    label: 'Value',
    width: 'w-32',
    responsive: 'hidden lg:table-cell',
  },
  {
    key: 'owner',
    label: 'Owner',
    width: 'w-40',
    responsive: 'hidden xl:table-cell',
    sortable: false,
  },
  { key: 'actions', label: '', width: 'w-12', sortable: false },
]

const ARIA_SORT = { asc: 'ascending', desc: 'descending' }

function SortIcon({ isActive, direction }) {
  if (!isActive) {
    // Visible at rest, just quiet. This is the difference between "sortable"
    // being discoverable and being a secret.
    return <ChevronsUpDown className="size-3.5 text-ink-subtle" aria-hidden="true" />
  }

  const Icon = direction === 'asc' ? ArrowUp : ArrowDown
  return <Icon className="size-3.5 text-brand-600" aria-hidden="true" />
}

/**
 * The cell people scan this table for.
 *
 * An overdue date is called out and a missing one reads "Not scheduled" rather
 * than being left blank — a blank cell looks like missing data, when it
 * actually means nobody has committed to ringing this person back.
 */
function FollowUp({ lead }) {
  const urgency = followUpUrgency(lead.nextFollowUpOn)

  if (!lead.nextFollowUpOn) {
    return <span className="text-sm text-ink-subtle italic">Not scheduled</span>
  }

  return (
    <span className="flex flex-col gap-1">
      <time
        dateTime={lead.nextFollowUpOn}
        className="text-sm whitespace-nowrap text-ink-muted"
      >
        {formatDate(lead.nextFollowUpOn)}
      </time>
      {urgency && (
        <Badge tone={urgency.tone} size="sm">
          {urgency.label}
        </Badge>
      )}
    </span>
  )
}

/**
 * A real `tel:` link — this list is worked from a phone as often as a desk,
 * and the number is the point of the record.
 */
function PhoneLink({ phone, className }) {
  return (
    <a
      href={`tel:${phone.replace(/\s/g, '')}`}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        'inline-flex items-center gap-1 transition-colors hover:text-brand-700',
        className,
      )}
    >
      <Phone className="size-3" aria-hidden="true" />
      {phone}
    </a>
  )
}

function SkeletonRows({ rows = 6 }) {
  return Array.from({ length: rows }, (_, index) => (
    <tr key={index} className="animate-pulse">
      {COLUMNS.map((column) => (
        <td key={column.key} className={cn('px-4 py-3.5', column.responsive)}>
          <div className="h-3 rounded bg-line" />
        </td>
      ))}
    </tr>
  ))
}

function LeadRow({ lead, menuItems }) {
  const navigate = useNavigate()

  // Row click is a mouse convenience; the name Link is what keyboard users and
  // screen readers navigate with. Bail when the click already landed on an
  // anchor or a button so we don't navigate on top of them.
  const handleRowClick = (event) => {
    if (event.target instanceof Element && event.target.closest('a, button')) return
    navigate(`/leads/${lead.id}`)
  }

  return (
    <tr
      onClick={handleRowClick}
      className="cursor-pointer transition-colors hover:bg-sunken"
    >
      <td className="px-4 py-3">
        <Link
          to={`/leads/${lead.id}`}
          className="block truncate text-sm font-medium text-ink transition-colors hover:text-brand-700"
        >
          {lead.contactName}
        </Link>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-subtle">
          <PhoneLink phone={lead.phone} />
          {lead.companyName && <span className="truncate">· {lead.companyName}</span>}
        </span>
      </td>

      <td className="px-4 py-3">
        <LeadStatusBadge status={lead.status} />
      </td>

      <td className="px-4 py-3">
        <FollowUp lead={lead} />
      </td>

      <td className="hidden px-4 py-3 xl:table-cell">
        <SolutionTypeBadge solutionType={lead.solutionType} size="sm" />
      </td>

      <td className="hidden px-4 py-3 lg:table-cell">
        {lead.estimatedValue == null ? (
          <span className="text-sm text-ink-subtle">—</span>
        ) : (
          <span className="text-sm tabular-nums whitespace-nowrap text-ink-muted">
            {formatRupees(lead.estimatedValue, { whole: true })}
          </span>
        )}
      </td>

      <td className="hidden px-4 py-3 xl:table-cell">
        {lead.owner ? (
          <span className="flex min-w-0 items-center gap-2">
            <Avatar initials={lead.owner.initials} size="sm" />
            <span className="truncate text-sm text-ink-muted">{lead.owner.name}</span>
          </span>
        ) : (
          <span className="text-sm text-ink-subtle">Unassigned</span>
        )}
      </td>

      <td className="px-2 py-3">
        <LeadMenu label={`Actions for ${lead.contactName}`} items={menuItems} />
      </td>
    </tr>
  )
}

/** The same row, restacked for a screen too narrow to hold six columns. */
function LeadCard({ lead, menuItems }) {
  const navigate = useNavigate()

  const handleClick = (event) => {
    if (event.target instanceof Element && event.target.closest('a, button')) return
    navigate(`/leads/${lead.id}`)
  }

  return (
    <li
      onClick={handleClick}
      className="flex cursor-pointer gap-3 px-4 py-3.5 transition-colors hover:bg-sunken"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/leads/${lead.id}`}
            className="truncate text-sm font-medium text-ink transition-colors hover:text-brand-700"
          >
            {lead.contactName}
          </Link>
          <LeadStatusBadge status={lead.status} size="sm" />
        </div>

        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-subtle">
          <PhoneLink phone={lead.phone} />
          {lead.companyName && <span className="truncate">· {lead.companyName}</span>}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <FollowUp lead={lead} />
          {lead.estimatedValue != null && (
            <span className="tabular-nums text-ink-muted">
              {formatRupees(lead.estimatedValue, { whole: true })}
            </span>
          )}
          {lead.owner && <span className="text-ink-subtle">{lead.owner.name}</span>}
        </div>
      </div>

      <LeadMenu label={`Actions for ${lead.contactName}`} items={menuItems} />
    </li>
  )
}

/**
 * @param {object} props
 * @param {Array} props.leads
 * @param {{by: string, dir: 'asc'|'desc'}} props.sort
 * @param {(field: string) => void} props.onToggleSort
 * @param {boolean} [props.isLoading]
 * @param {object} props.actions canManage, canConvert and the handlers.
 */
export function LeadsTable({ leads, sort, onToggleSort, isLoading = false, actions }) {
  const showSkeleton = isLoading && leads.length === 0

  const itemsFor = (lead) =>
    buildLeadMenuItems({
      lead,
      canManage: actions.canManage,
      canConvert: actions.canConvert,
      on: actions.on,
    })

  return (
    <Card className="overflow-hidden">
      {/* Cards below md — a six-column table on a phone is three columns and a
          horizontal scrollbar. */}
      <ul className="divide-y divide-line md:hidden">
        {showSkeleton
          ? Array.from({ length: 5 }, (_, index) => (
              <li key={index} className="animate-pulse px-4 py-4">
                <div className="h-3 w-1/2 rounded bg-line" />
                <div className="mt-2 h-3 w-1/3 rounded bg-line" />
              </li>
            ))
          : leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} menuItems={itemsFor(lead)} />
            ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table
          className="w-full table-fixed border-collapse"
          aria-busy={isLoading || undefined}
        >
          <caption className="sr-only">
            Leads, sortable by column. Select a row to open the lead.
          </caption>

          <thead>
            <tr className="border-b border-line bg-sunken">
              {COLUMNS.map((column) => {
                const isSortable = column.sortable !== false
                const isActive = isSortable && sort.by === column.key

                const label = (
                  <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                    {column.label}
                  </span>
                )

                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      isSortable ? (isActive ? ARIA_SORT[sort.dir] : 'none') : undefined
                    }
                    className={cn(
                      'px-4 py-2.5 text-left',
                      column.width,
                      column.responsive,
                    )}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => onToggleSort(column.key)}
                        className="inline-flex items-center gap-1.5 rounded transition-colors hover:text-ink"
                      >
                        {label}
                        <SortIcon isActive={isActive} direction={sort.dir} />
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {showSkeleton ? (
              <SkeletonRows />
            ) : (
              leads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} menuItems={itemsFor(lead)} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
