import { useState } from 'react'
import { FileText, Search, SearchX, TriangleAlert, X } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/common'
import { Button, Input, Pagination, Select } from '@/components/ui'
import { useAuth } from '@/features/auth'
import { toast } from '@/lib/toastStore'
import { useQuotations } from '../hooks/useQuotations'
import { updateQuotationStatus } from '../api'
import { QUOTATION_STATUS_OPTIONS } from '../constants'
import { QuotationsTable } from './QuotationsTable'
import { CreateQuotationModal } from './CreateQuotationModal'

export function QuotationsPage() {
  const {
    quotations,
    isLoading,
    error,
    filteredTotal,
    filters,
    sort,
    hasActiveFilters,
    setFilter,
    resetFilters,
    toggleSort,
    refresh,
    page,
    lastPage,
    perPage,
    setPage,
  } = useQuotations()

  // POST /api/quotations and PATCH /:id/status are both Admin/Support —
  // quotations are a commercial document, so Developers read but do not price.
  const { can } = useAuth()
  const canCreate = can('quotations:create')
  const canSetStatus = can('quotations:setStatus')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [pendingId, setPendingId] = useState(null)

  const handleCreated = (quotation) => {
    setIsCreateOpen(false)
    // Refetch rather than splice: the 201 carries only the reference and
    // totals, not a full row, and active filters may exclude it anyway.
    refresh()
    toast.success('Quotation created', {
      description: `${quotation.id} · ${CURRENCY.format(quotation.finalAmount)}`,
    })
  }

  const handleStatusChange = async (quotationId, status) => {
    setPendingId(quotationId)
    try {
      const result = await updateQuotationStatus(quotationId, status)
      refresh()
      toast.success('Status updated', {
        description: `${result.id} is now ${result.status.toLowerCase()}.`,
      })
    } catch (caught) {
      toast.error('Could not update the status', {
        description: caught.detail ?? caught.message,
      })
    } finally {
      setPendingId(null)
    }
  }

  const isEmpty = !isLoading && quotations.length === 0

  const rangeStart = filteredTotal === 0 ? 0 : (page - 1) * perPage + 1
  const rangeEnd = Math.min(page * perPage, filteredTotal)

  return (
    <>
      <PageHeader
        description="Quotations raised for customers, priced from the catalogue."
        actions={
          canCreate && (
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              Create quotation
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <Input
          type="search"
          value={filters.query}
          onChange={(event) => setFilter('query', event.target.value)}
          aria-label="Search quotations"
          placeholder="Search by customer"
          leadingIcon={<Search className="size-4" />}
          wrapperClassName="w-full sm:w-72"
        />

        <Select
          value={filters.status}
          onChange={(event) => setFilter('status', event.target.value)}
          aria-label="Filter by status"
          placeholder="All statuses"
          options={QUOTATION_STATUS_OPTIONS}
          wrapperClassName="w-40"
        />

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="size-4" aria-hidden="true" />
            Clear
          </Button>
        )}

        {!error && filteredTotal > 0 && (
          <p className="ml-auto text-sm whitespace-nowrap text-ink-muted">
            Showing {rangeStart}–{rangeEnd} of {filteredTotal} quotations
          </p>
        )}
      </div>

      {error ? (
        <EmptyState
          icon={TriangleAlert}
          title="Couldn't load quotations"
          description={error.message ?? 'Something went wrong fetching quotations.'}
          action={
            <Button size="sm" onClick={refresh}>
              Try again
            </Button>
          }
        />
      ) : isEmpty ? (
        hasActiveFilters ? (
          <EmptyState
            icon={SearchX}
            title="No matching quotations"
            description="No quotations match the current filters. Try clearing them or broadening your search."
            action={
              <Button size="sm" variant="secondary" onClick={resetFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="No quotations yet"
            description="Quotations will appear here once your team creates them."
            action={
              canCreate && (
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                  Create the first quotation
                </Button>
              )
            }
          />
        )
      ) : (
        <>
          <QuotationsTable
            quotations={quotations}
            sort={sort}
            onToggleSort={toggleSort}
            isLoading={isLoading}
            canSetStatus={canSetStatus}
            pendingId={pendingId}
            onStatusChange={handleStatusChange}
          />

          <Pagination
            currentPage={page}
            lastPage={lastPage}
            onPageChange={setPage}
            className="mt-4"
          />
        </>
      )}

      {isCreateOpen && (
        <CreateQuotationModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}

const CURRENCY = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 2,
})
