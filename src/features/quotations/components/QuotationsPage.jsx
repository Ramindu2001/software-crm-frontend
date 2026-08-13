import { useState } from 'react'
import { FileText, Search, SearchX, TriangleAlert, X } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/common'
import { Button, Input, Pagination, Select } from '@/components/ui'
import { toast } from '@/lib/toastStore'
import { useQuotations } from '../hooks/useQuotations'
import { QuotationsTable } from './QuotationsTable'
import { CreateQuotationModal } from './CreateQuotationModal'

const STATUS_OPTIONS = [
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
]

export function QuotationsPage() {
  const {
    quotations,
    isLoading,
    error,
    total,
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

  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const handleCreated = (quotation) => {
    setIsCreateOpen(false)
    refresh()
    toast.success('Quotation created', {
      description: `Quotation for ${quotation.customerName} saved successfully.`,
    })
  }

  const isEmpty = !isLoading && quotations.length === 0

  const rangeStart = filteredTotal === 0 ? 0 : (page - 1) * perPage + 1
  const rangeEnd = Math.min(page * perPage, filteredTotal)

  return (
    <>
      <PageHeader
        description="Manage and track quotations sent to customers."
        actions={
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            Create quotation
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <Input
          type="search"
          value={filters.query}
          onChange={(event) => setFilter('query', event.target.value)}
          aria-label="Search quotations"
          placeholder="Search by customer..."
          leadingIcon={<Search className="size-4" />}
          wrapperClassName="w-full sm:w-72"
        />

        <Select
          value={filters.status}
          onChange={(event) => setFilter('status', event.target.value)}
          aria-label="Filter by status"
          placeholder="All statuses"
          options={STATUS_OPTIONS}
          wrapperClassName="w-40"
        />

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="size-4" aria-hidden="true" />
            Clear
          </Button>
        )}

        {!error && (
          <p className="ml-auto text-sm whitespace-nowrap text-ink-muted">
            {filteredTotal === 0
              ? `0 of ${total} quotations`
              : `Showing ${rangeStart}–${rangeEnd} of ${filteredTotal} quotations`}
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
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                Create the first quotation
              </Button>
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
