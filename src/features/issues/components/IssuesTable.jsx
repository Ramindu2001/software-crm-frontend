import { Link, useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/format'
import { Avatar, Card } from '@/components/ui'
import { IssuePriorityBadge, IssueStatusBadge } from './IssueBadge'

/**
 * `sortable: false` marks a column the API will not order by — assignee is
 * a joined name with no entry in the backend's allowlist, and sending it
 * would come back 400 rather than sorted. Those headers render as plain
 * labels instead of buttons.
 */
const COLUMNS = [
  { key: 'id', label: 'ID', width: 'w-28' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status', width: 'w-36' },
  { key: 'priority', label: 'Priority', width: 'w-28' },
  // Progressively dropped on narrower screens rather than squeezed.
  {
    key: 'assignee',
    label: 'Assignee',
    width: 'w-48',
    responsive: 'hidden lg:table-cell',
    sortable: false,
  },
  {
    key: 'createdAt',
    label: 'Created',
    width: 'w-36',
    responsive: 'hidden md:table-cell',
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
        <td
          key={column.key}
          className={cn('px-4 py-3.5', column.responsive)}
        >
          <div className="h-3 rounded bg-line" />
        </td>
      ))}
    </tr>
  ))
}

function IssueRow({ issue }) {
  const navigate = useNavigate()

  // Row click is a mouse convenience; the title Link is what keyboard users
  // and screen readers actually navigate with. Bail when the click already
  // landed on the anchor so we don't navigate twice.
  const handleRowClick = (event) => {
    if (event.target instanceof Element && event.target.closest('a')) return
    navigate(`/issues/${issue.id}`)
  }

  return (
    <tr
      onClick={handleRowClick}
      className="cursor-pointer transition-colors hover:bg-sunken"
    >
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-ink-subtle">{issue.id}</span>
      </td>

      <td className="px-4 py-3">
        <Link
          to={`/issues/${issue.id}`}
          className="block truncate text-sm font-medium text-ink transition-colors hover:text-brand-700"
        >
          {issue.title}
        </Link>
        <span className="block truncate text-xs text-ink-subtle">
          {issue.customer.name}
        </span>
      </td>

      <td className="px-4 py-3">
        <IssueStatusBadge status={issue.status} />
      </td>

      <td className="px-4 py-3">
        <IssuePriorityBadge priority={issue.priority} />
      </td>

      <td className="hidden px-4 py-3 lg:table-cell">
        {issue.assignee ? (
          <span className="flex min-w-0 items-center gap-2">
            <Avatar initials={issue.assignee.initials} size="sm" />
            <span className="truncate text-sm text-ink-muted">
              {issue.assignee.name}
            </span>
          </span>
        ) : (
          <span className="text-sm text-ink-subtle">Unassigned</span>
        )}
      </td>

      <td className="hidden px-4 py-3 md:table-cell">
        <time
          dateTime={issue.createdAt}
          className="text-sm whitespace-nowrap text-ink-muted"
        >
          {formatRelativeTime(issue.createdAt)}
        </time>
      </td>
    </tr>
  )
}

/**
 * Dense, sortable issue list.
 *
 * @param {object} props
 * @param {Array} props.issues
 * @param {{by: string, dir: 'asc'|'desc'}} props.sort
 * @param {(field: string) => void} props.onToggleSort
 * @param {boolean} [props.isLoading]
 */
export function IssuesTable({ issues, sort, onToggleSort, isLoading = false }) {
  const showSkeleton = isLoading && issues.length === 0

  return (
    <Card className="overflow-hidden">
      {/* Wide tables scroll inside the card rather than the page.
          max-h keeps dense lists manageable; the sticky thead ensures column
          headers stay visible while rows scroll. */}
      <div className="max-h-[32rem] overflow-auto">
        <table
          className="w-full min-w-3xl table-fixed border-collapse"
          aria-busy={isLoading || undefined}
        >
          <caption className="sr-only">
            Issues, sortable by column. Select a row to open the issue.
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
                        className="group inline-flex items-center gap-1.5 transition-colors hover:[&>span]:text-ink"
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

          <tbody
            className={cn(
              'divide-y divide-line transition-opacity',
              // Keep previous rows visible but dimmed while refetching, rather
              // than flashing an empty table on every filter change.
              isLoading && !showSkeleton && 'pointer-events-none opacity-60',
            )}
          >
            {showSkeleton ? (
              <SkeletonRows />
            ) : (
              issues.map((issue) => <IssueRow key={issue.id} issue={issue} />)
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
