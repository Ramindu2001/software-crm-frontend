import { ArrowDown, ArrowUp, ChevronsUpDown, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui'

/**
 * Columns are exactly the fields GET /api/customers returns. `address` is part
 * of the list payload precisely so a table can show it without a request per
 * row — but it is returned, not searched, so a query never matches on it.
 *
 * `sortable: false` marks columns outside the API's sort allowlist; asking for
 * them would come back 400, so those headers render as plain labels.
 */
const COLUMNS = [
  { key: 'name', label: 'Company' },
  { key: 'contactPerson', label: 'Contact', width: 'w-48' },
  { key: 'email', label: 'Email', width: 'w-60', responsive: 'hidden md:table-cell' },
  {
    key: 'phone',
    label: 'Phone',
    width: 'w-40',
    responsive: 'hidden lg:table-cell',
    sortable: false,
  },
  {
    key: 'address',
    label: 'Address',
    width: 'w-64',
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

function SkeletonRows({ rows = 6, columnCount }) {
  return Array.from({ length: rows }, (_, index) => (
    <tr key={index} className="animate-pulse">
      {Array.from({ length: columnCount }, (_, cell) => (
        <td key={cell} className="px-4 py-3.5">
          <div className="h-3 rounded bg-line" />
        </td>
      ))}
    </tr>
  ))
}

function CustomerRow({ customer, canEdit, onEdit }) {
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

      <td className="hidden px-4 py-3 xl:table-cell">
        {/* Optional column — plenty of customers have no address on file. */}
        <span className="block truncate text-sm text-ink-muted" title={customer.address}>
          {customer.address || '—'}
        </span>
      </td>

      {canEdit && (
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={() => onEdit(customer)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-ink-muted transition-colors hover:bg-surface hover:text-brand-700"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            {/* The company name keeps the accessible name unique across rows. */}
            Edit<span className="sr-only"> {customer.name}</span>
          </button>
        </td>
      )}
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
 * @param {boolean} [props.canEdit] Renders the edit action. PUT is
 *   Admin/Support only.
 * @param {(customer: object) => void} [props.onEdit]
 */
export function CustomersTable({
  customers,
  sort,
  onToggleSort,
  isLoading = false,
  canEdit = false,
  onEdit,
}) {
  const showSkeleton = isLoading && customers.length === 0
  const columnCount = COLUMNS.length + (canEdit ? 1 : 0)

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

              {canEdit && (
                <th scope="col" className="w-24 px-4 py-2.5 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>

          <tbody
            className={cn(
              'divide-y divide-line transition-opacity',
              isLoading && !showSkeleton && 'pointer-events-none opacity-60',
            )}
          >
            {showSkeleton ? (
              <SkeletonRows columnCount={columnCount} />
            ) : (
              customers.map((customer) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  canEdit={canEdit}
                  onEdit={onEdit}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
