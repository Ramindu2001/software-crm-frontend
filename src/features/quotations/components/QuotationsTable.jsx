import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { Badge, Card } from '@/components/ui'

const COLUMNS = [
  { key: 'customerName', label: 'Customer', width: 'w-48' },
  { key: 'date', label: 'Date', width: 'w-32' },
  { key: 'totalAmount', label: 'Amount', width: 'w-32 text-right' },
  { key: 'status', label: 'Status', width: 'w-28' },
]

const ARIA_SORT = { asc: 'ascending', desc: 'descending' }

const STATUS_TONES = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
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

function QuotationRow({ quotation }) {
  return (
    <tr className="transition-colors hover:bg-sunken">
      <td className="px-4 py-3">
        <span className="block truncate text-sm font-medium text-ink">
          {quotation.customerName}
        </span>
      </td>

      <td className="px-4 py-3">
        <time
          dateTime={quotation.date}
          className="text-sm whitespace-nowrap text-ink-muted"
        >
          {formatDate(quotation.date)}
        </time>
      </td>

      <td className="px-4 py-3 text-right">
        <span className="text-sm tabular-nums text-ink">
          {CURRENCY_FORMATTER.format(quotation.totalAmount)}
        </span>
      </td>

      <td className="px-4 py-3">
        <Badge tone={STATUS_TONES[quotation.status] ?? 'neutral'}>
          {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
        </Badge>
      </td>
    </tr>
  )
}

export function QuotationsTable({ quotations, sort, onToggleSort, isLoading = false }) {
  const showSkeleton = isLoading && quotations.length === 0

  return (
    <Card className="overflow-hidden">
      <div className="max-h-[32rem] overflow-auto">
        <table
          className="w-full min-w-3xl table-fixed border-collapse"
          aria-busy={isLoading || undefined}
        >
          <caption className="sr-only">
            Quotations, sortable by column.
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
                      className={cn(
                        "group inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase transition-colors hover:text-ink",
                        column.key === 'totalAmount' && "w-full justify-end"
                      )}
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
              quotations.map((quotation) => (
                <QuotationRow key={quotation.id} quotation={quotation} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
