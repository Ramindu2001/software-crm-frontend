import { Link, useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronsUpDown, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate, formatRupees } from '@/lib/format'
import { Avatar, Badge, Card } from '@/components/ui'
import { followUpUrgency } from '../constants'
import { LeadStatusBadge, SolutionTypeBadge } from './LeadBadges'

/**
 * `sortable: false` marks a column the API will not order by — owner is a
 * joined name with no entry in the backend's allowlist, and sending it would
 * come back 400 rather than sorted. Those headers render as plain labels.
 */
const COLUMNS = [
  { key: 'contactName', label: 'Contact', width: 'w-64' },
  { key: 'status', label: 'Stage', width: 'w-44' },
  {
    key: 'solutionType',
    label: 'Solution',
    width: 'w-40',
    responsive: 'hidden xl:table-cell',
    sortable: false,
  },
  { key: 'nextFollowUp', label: 'Follow-up', width: 'w-44' },
  {
    key: 'estimatedValue',
    label: 'Value',
    width: 'w-36',
    responsive: 'hidden lg:table-cell',
  },
  {
    key: 'owner',
    label: 'Owner',
    width: 'w-44',
    responsive: 'hidden xl:table-cell',
    sortable: false,
  },
]

const ARIA_SORT = { asc: 'ascending', desc: 'descending' }

function SortIcon({ isActive, direction }) {
  if (!isActive) {
    return (
      <ChevronsUpDown
        className="size-3.5 text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
    )
  }

  const Icon = direction === 'asc' ? ArrowUp : ArrowDown
  return <Icon className="size-3.5 text-brand-600" aria-hidden="true" />
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

/**
 * The follow-up cell, which is the one people scan this table for.
 *
 * An overdue date is called out in red and a missing one reads "Not scheduled"
 * rather than being left blank — a blank cell looks like missing data, when it
 * actually means nobody has committed to ringing this person back.
 */
function FollowUpCell({ lead }) {
  const urgency = followUpUrgency(lead.nextFollowUpOn)

  if (!lead.nextFollowUpOn) {
    return <span className="text-sm text-ink-subtle italic">Not scheduled</span>
  }

  return (
    <span className="flex flex-col gap-1">
      <time dateTime={lead.nextFollowUpOn} className="text-sm whitespace-nowrap text-ink-muted">
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

function LeadRow({ lead }) {
  const navigate = useNavigate()

  // Row click is a mouse convenience; the name Link is what keyboard users and
  // screen readers actually navigate with. Bail when the click already landed
  // on an anchor so we don't navigate twice — and skip the tel: link, which
  // should dial rather than open the lead.
  const handleRowClick = (event) => {
    if (event.target instanceof Element && event.target.closest('a')) return
    navigate(`/leads/${lead.id}`)
  }

  return (
    <tr onClick={handleRowClick} className="cursor-pointer transition-colors hover:bg-sunken">
      <td className="px-4 py-3">
        <Link
          to={`/leads/${lead.id}`}
          className="block truncate text-sm font-medium text-ink transition-colors hover:text-brand-700"
        >
          {lead.contactName}
        </Link>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-subtle">
          {/* A real tel: link: this list is worked from a phone as often as a
              desk, and the number is the point of the record. */}
          <a
            href={`tel:${lead.phone.replace(/\s/g, '')}`}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex items-center gap-1 transition-colors hover:text-brand-700"
          >
            <Phone className="size-3" aria-hidden="true" />
            {lead.phone}
          </a>
          {lead.companyName && <span className="truncate">· {lead.companyName}</span>}
        </span>
      </td>

      <td className="px-4 py-3">
        <LeadStatusBadge status={lead.status} />
      </td>

      <td className="hidden px-4 py-3 xl:table-cell">
        <SolutionTypeBadge solutionType={lead.solutionType} size="sm" />
      </td>

      <td className="px-4 py-3">
        <FollowUpCell lead={lead} />
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
    </tr>
  )
}

/**
 * Dense, sortable lead list.
 *
 * @param {object} props
 * @param {Array} props.leads
 * @param {{by: string, dir: 'asc'|'desc'}} props.sort
 * @param {(field: string) => void} props.onToggleSort
 * @param {boolean} [props.isLoading]
 */
export function LeadsTable({ leads, sort, onToggleSort, isLoading = false }) {
  const showSkeleton = isLoading && leads.length === 0

  return (
    <Card className="overflow-hidden">
      {/* Wide tables scroll inside the card rather than the page. max-h keeps
          dense lists manageable; the sticky thead keeps column headers visible
          while rows scroll. */}
      <div className="max-h-[32rem] overflow-auto">
        <table
          className="w-full min-w-3xl table-fixed border-collapse"
          aria-busy={isLoading || undefined}
        >
          <caption className="sr-only">
            Leads, sortable by column. Select a row to open the lead.
          </caption>

          <thead className="sticky top-0 z-10">
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
                    className={cn('px-4 py-2.5 text-left', column.width, column.responsive)}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => onToggleSort(column.key)}
                        className="group inline-flex items-center gap-1.5"
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
              leads.map((lead) => <LeadRow key={lead.id} lead={lead} />)
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
