import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/format'
import { Badge, Card } from '@/components/ui'

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'industry', label: 'Industry', width: 'w-36' },
  { key: 'status', label: 'Status', width: 'w-28' },
  { key: 'issueCount', label: 'Issues', width: 'w-24' },
  { key: 'contactName', label: 'Contact', width: 'w-44', responsive: 'hidden lg:table-cell' },
  { key: 'updatedAt', label: 'Updated', width: 'w-36', responsive: 'hidden md:table-cell' },
]

const ARIA_SORT = { asc: 'ascending', desc: 'descending' }

const STATUS_TONES = {
  active: 'success',
  inactive: 'neutral',
}

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

function CustomerRow({ customer }) {
  return (
    <tr className="transition-colors hover:bg-sunken">
      <td className="px-4 py-3">
        <div className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">
            {customer.name}
          </span>
          <span className="block truncate text-xs text-ink-subtle">
            {customer.email}
          </span>
        </div>
      </td>

      <td className="px-4 py-3">
        <span className="text-sm text-ink-muted">{customer.industry}</span>
      </td>

      <td className="px-4 py-3">
        <Badge tone={STATUS_TONES[customer.status] ?? 'neutral'}>
          {customer.status === 'active' ? 'Active' : 'Inactive'}
        </Badge>
      </td>

      <td className="px-4 py-3">
        <span className="text-sm text-ink-muted tabular-nums">
          {customer.issueCount}
        </span>
      </td>

      <td className="hidden px-4 py-3 lg:table-cell">
        <span className="truncate text-sm text-ink-muted">
          {customer.contactName || '—'}
        </span>
      </td>

      <td className="hidden px-4 py-3 md:table-cell">
        <time
          dateTime={customer.updatedAt}
          className="text-sm whitespace-nowrap text-ink-muted"
        >
          {formatRelativeTime(customer.updatedAt)}
        </time>
      </td>
    </tr>
  )
}

/**
 * Dense, sortable customer list.
 *
 * @param {object} props
 * @param {Array} props.customers
 * @param {{by: string, dir: 'asc'|'desc'}} props.sort
 * @param {(field: string) => void} props.onToggleSort
 * @param {boolean} [props.isLoading]
 */
export function CustomersTable({ customers, sort, onToggleSort, isLoading = false }) {
  const showSkeleton = isLoading && customers.length === 0

  return (
    <Card className="overflow-hidden">
      {/* max-h keeps dense lists manageable; the sticky thead ensures column
          headers stay visible while rows scroll. */}
      <div className="max-h-[32rem] overflow-auto">
        <table
          className="w-full min-w-3xl table-fixed border-collapse"
          aria-busy={isLoading || undefined}
        >
          <caption className="sr-only">
            Customers, sortable by column.
          </caption>

          <thead className="sticky top-0 z-10">
            <tr className="border-b border-line bg-sunken">
              {COLUMNS.map((column) => {
                const isActive = sort.by === column.key
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={isActive ? ARIA_SORT[sort.dir] : 'none'}
                    className={cn(
                      'px-4 py-2.5 text-left',
                      column.width,
                      column.responsive,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleSort(column.key)}
                      className="group inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase transition-colors hover:text-ink"
                    >
                      {column.label}
                      <SortIcon isActive={isActive} direction={sort.dir} />
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody
            className={cn(
              'divide-y divide-line transition-opacity',
              isLoading && !showSkeleton && 'pointer-events-none opacity-60',
            )}
          >
            {showSkeleton ? (
              <SkeletonRows />
            ) : (
              customers.map((customer) => (
                <CustomerRow key={customer.id} customer={customer} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
