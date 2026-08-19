import { Link, useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, ChevronsUpDown, Pencil, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { Badge, Card } from '@/components/ui'
import { formatRupees } from '@/lib/format'
import { isEditable, QUOTATION_STATUS } from '../constants'

/**
 * `sortable: false` marks columns outside the API's sort allowlist — customer
 * lives on the joined customers table, and asking for it returns 400.
 */
const COLUMNS = [
  { key: 'reference', label: 'Reference', width: 'w-32' },
  { key: 'customerName', label: 'Customer', sortable: false },
  { key: 'createdAt', label: 'Date', width: 'w-28' },
  { key: 'finalAmount', label: 'Total', width: 'w-32', align: 'right' },
  { key: 'status', label: 'Status', width: 'w-28' },
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

function QuotationRow({ quotation, canEdit }) {
  const navigate = useNavigate()
  const meta = QUOTATION_STATUS[quotation.status]

  // Row click is a mouse convenience; the reference link is what keyboard
  // users and screen readers navigate with. Bail when the click already landed
  // on an anchor so we don't navigate twice.
  const handleRowClick = (event) => {
    if (event.target instanceof Element && event.target.closest('a')) return
    navigate(`/quotations/${quotation.id}`)
  }

  return (
    <tr
      onClick={handleRowClick}
      className="cursor-pointer transition-colors hover:bg-sunken"
    >
      <td className="px-4 py-3">
        <Link
          to={`/quotations/${quotation.id}`}
          className="font-mono text-xs font-medium text-ink transition-colors hover:text-brand-700"
        >
          {quotation.id}
        </Link>
      </td>

      <td className="px-4 py-3">
        <span className="block truncate text-sm font-medium text-ink">
          {quotation.customerName}
        </span>
        <span className="block truncate text-xs text-ink-subtle">
          {quotation.itemsCount} {quotation.itemsCount === 1 ? 'item' : 'items'}
          {quotation.preparedBy && ` · ${quotation.preparedBy}`}
        </span>
      </td>

      <td className="px-4 py-3">
        <time
          dateTime={quotation.createdAt}
          className="text-sm whitespace-nowrap text-ink-muted"
        >
          {formatDate(quotation.createdAt)}
        </time>
      </td>

      <td className="px-4 py-3 text-right">
        <span className="text-sm font-medium tabular-nums text-ink">
          {formatRupees(quotation.finalAmount)}
        </span>
        {quotation.discountPercent > 0 && (
          <span className="block text-xs text-ink-subtle">
            {quotation.discountPercent}% off
          </span>
        )}
      </td>

      <td className="px-4 py-3">
        <Badge tone={meta?.tone ?? 'neutral'} size="sm" dot>
          {meta?.label ?? quotation.status}
        </Badge>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-0.5">
          {/* Editing is offered only while Pending — the API refuses anything
              else with a 409, so a visible button would be a dead end. */}
          {canEdit && isEditable(quotation) && (
            <Link
              to={`/quotations/${quotation.id}/edit`}
              className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-brand-700"
              aria-label={`Edit ${quotation.id}`}
              title="Edit"
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Link>
          )}
          <Link
            to={`/quotations/${quotation.id}/print`}
            className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-brand-700"
            aria-label={`Print ${quotation.id}`}
            title="Print / Save as PDF"
          >
            <Printer className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </td>
    </tr>
  )
}

/**
 * @param {object} props
 * @param {Array} props.quotations
 * @param {{by: string, dir: 'asc'|'desc'}} props.sort
 * @param {(field: string) => void} props.onToggleSort
 * @param {boolean} [props.isLoading]
 * @param {boolean} [props.canEdit] Shows the edit action on Pending rows.
 */
export function QuotationsTable({
  quotations,
  sort,
  onToggleSort,
  isLoading = false,
  canEdit = false,
}) {
  const showSkeleton = isLoading && quotations.length === 0

  return (
    <Card className="overflow-hidden">
      <div className="max-h-[32rem] overflow-auto">
        <table
          className="w-full min-w-3xl table-fixed border-collapse"
          aria-busy={isLoading || undefined}
        >
          <caption className="sr-only">
            Quotations, sortable by column. Select a row to open it.
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
                    className={cn('px-4 py-2.5 text-left', column.width)}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => onToggleSort(column.key)}
                        className={cn(
                          'group inline-flex items-center gap-1.5 transition-colors hover:[&>span]:text-ink',
                          column.align === 'right' && 'w-full justify-end',
                        )}
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

              <th scope="col" className="w-24 px-4 py-2.5 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody
            className={cn(
              'divide-y divide-line transition-opacity',
              isLoading && !showSkeleton && 'pointer-events-none opacity-60',
            )}
          >
            {showSkeleton ? (
              <SkeletonRows columnCount={COLUMNS.length + 1} />
            ) : (
              quotations.map((quotation) => (
                <QuotationRow
                  key={quotation.quotationId}
                  quotation={quotation}
                  canEdit={canEdit}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
