import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { Badge, Card, Select } from '@/components/ui'
import { QUOTATION_STATUS, QUOTATION_STATUS_OPTIONS } from '../constants'

/**
 * Columns are what the list endpoint returns. There is no quotation date
 * column in the schema — `created_at` is when it was raised — and no line
 * items, because no endpoint reads them back; `items_count` stands in.
 *
 * `customerName` is not sortable: it lives on the joined customers table and
 * is not in the API's sort allowlist.
 */
const COLUMNS = [
  { key: 'id', label: 'Reference', width: 'w-36' },
  { key: 'customerName', label: 'Customer', sortable: false },
  { key: 'createdAt', label: 'Raised', width: 'w-32' },
  { key: 'discount', label: 'Discount', width: 'w-28 text-right', align: 'right' },
  { key: 'finalAmount', label: 'Total', width: 'w-32 text-right', align: 'right' },
  { key: 'status', label: 'Status', width: 'w-40' },
]

const ARIA_SORT = { asc: 'ascending', desc: 'descending' }

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 2,
})

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

function QuotationRow({ quotation, canSetStatus, pendingId, onStatusChange }) {
  const meta = QUOTATION_STATUS[quotation.status]
  const isPending = pendingId === quotation.quotationId

  return (
    <tr className="transition-colors hover:bg-sunken">
      <td className="px-4 py-3">
        <span className="font-mono text-xs text-ink-subtle">{quotation.id}</span>
      </td>

      <td className="px-4 py-3">
        <span className="block truncate text-sm font-medium text-ink">
          {quotation.customerName}
        </span>
        <span className="block truncate text-xs text-ink-subtle">
          {quotation.itemsCount}{' '}
          {quotation.itemsCount === 1 ? 'line item' : 'line items'}
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
        <span className="text-sm tabular-nums text-ink-muted">
          {quotation.discount > 0
            ? `−${CURRENCY_FORMATTER.format(quotation.discount)}`
            : '—'}
        </span>
      </td>

      <td className="px-4 py-3 text-right">
        {/* final_amount is what the customer pays: total minus discount. */}
        <span className="text-sm font-medium tabular-nums text-ink">
          {CURRENCY_FORMATTER.format(quotation.finalAmount)}
        </span>
      </td>

      <td className="px-4 py-3">
        {canSetStatus ? (
          // The numeric key rather than the QT- reference: resolving a
          // reference costs the server an extra lookup query.
          <Select
            aria-label={`Status for ${quotation.id}`}
            value={quotation.status}
            onChange={(event) =>
              onStatusChange(quotation.quotationId, event.target.value)
            }
            options={QUOTATION_STATUS_OPTIONS}
            disabled={isPending}
            wrapperClassName="w-full"
          />
        ) : (
          <Badge tone={meta?.tone ?? 'neutral'} dot>
            {meta?.label ?? quotation.status}
          </Badge>
        )}
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
 * @param {boolean} [props.canSetStatus] Renders the status control instead of
 *   a read-only badge. PATCH /:id/status is Admin/Support only.
 * @param {number|null} [props.pendingId] Quotation currently being updated.
 * @param {(id: number, status: string) => void} [props.onStatusChange]
 */
export function QuotationsTable({
  quotations,
  sort,
  onToggleSort,
  isLoading = false,
  canSetStatus = false,
  pendingId = null,
  onStatusChange,
}) {
  const showSkeleton = isLoading && quotations.length === 0

  return (
    <Card className="overflow-hidden">
      <div className="max-h-[32rem] overflow-auto">
        <table
          className="w-full min-w-3xl table-fixed border-collapse"
          aria-busy={isLoading || undefined}
        >
          <caption className="sr-only">Quotations, sortable by column.</caption>

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
              quotations.map((quotation) => (
                <QuotationRow
                  key={quotation.quotationId}
                  quotation={quotation}
                  canSetStatus={canSetStatus}
                  pendingId={pendingId}
                  onStatusChange={onStatusChange}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
