import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui'

/**
 * Columns are exactly the fields GET /api/customers returns. The endpoint is
 * lean on purpose — it exists to fill pickers — so there is no status,
 * industry or issue count to show, and none of those exist in the schema
 * either.
 */
const COLUMNS = [
  { key: 'name', label: 'Company' },
  { key: 'contactPerson', label: 'Contact', width: 'w-52' },
  { key: 'email', label: 'Email', width: 'w-64', responsive: 'hidden md:table-cell' },
  {
    key: 'phone',
    label: 'Phone',
    width: 'w-40',
    responsive: 'hidden lg:table-cell',
    // Not in the API's sort allowlist; sending it would be a 400.
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

function CustomerRow({ customer }) {
  return (
    <tr className="transition-colors hover:bg-sunken">
      <td className="px-4 py-3">
        <span className="block truncate text-sm font-medium text-ink">
          {customer.name}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className="block truncate text-sm text-ink-muted">
          {customer.contactPerson || '—'}
        </span>
      </td>

      <td className="hidden px-4 py-3 md:table-cell">
        {customer.email ? (
          <a
            href={`mailto:${customer.email}`}
            className="block truncate text-sm text-ink-muted transition-colors hover:text-brand-700"
          >
            {customer.email}
          </a>
        ) : (
          <span className="text-sm text-ink-subtle">—</span>
        )}
      </td>

      <td className="hidden px-4 py-3 lg:table-cell">
        <span className="text-sm whitespace-nowrap text-ink-muted tabular-nums">
          {customer.phone || '—'}
        </span>
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
          <caption className="sr-only">Customers, sortable by column.</caption>

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
