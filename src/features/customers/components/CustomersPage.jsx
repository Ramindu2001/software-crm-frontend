import { useState } from 'react'
import { CircleDot, Search, SearchX, TriangleAlert, X } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/common'
import { Button, Input, Pagination, Select } from '@/components/ui'
import { toast } from '@/lib/toastStore'
import { useCustomers } from '../hooks/useCustomers'
import { CustomersTable } from './CustomersTable'
import { CreateCustomerModal } from './CreateCustomerModal'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export function CustomersPage() {
  const {
    customers,
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
  } = useCustomers()

  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const handleCreated = (customer) => {
    setIsCreateOpen(false)
    refresh()
    toast.success('Customer created', {
      description: customer.name,
    })
  }

  const isEmpty = !isLoading && customers.length === 0

  // Compute the visible row range for the filter summary.
  const rangeStart = filteredTotal === 0 ? 0 : (page - 1) * perPage + 1
  const rangeEnd = Math.min(page * perPage, filteredTotal)

  return (
    <>
      <PageHeader
        description="Companies and contacts raising issues with your team."
        actions={
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            Add customer
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <Input
          type="search"
          value={filters.query}
          onChange={(event) => setFilter('query', event.target.value)}
          aria-label="Search customers"
          placeholder="Search customers"
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
              ? `0 of ${total} customers`
              : `Showing ${rangeStart}–${rangeEnd} of ${filteredTotal} customers`}
          </p>
        )}
      </div>

      {error ? (
        <EmptyState
          icon={TriangleAlert}
          title="Couldn't load customers"
          description={error.message ?? 'Something went wrong fetching customers.'}
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
            title="No matching customers"
            description="No customers match the current filters. Try clearing them or broadening your search."
            action={
              <Button size="sm" variant="secondary" onClick={resetFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={CircleDot}
            title="No customers yet"
            description="Customer records will appear here once your team adds them."
            action={
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                Add the first customer
              </Button>
            }
          />
        )
      ) : (
        <>
          <CustomersTable
            customers={customers}
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
        <CreateCustomerModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}
