import { Search, SearchX, TriangleAlert, Users, X } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/common'
import { Button, Input, Pagination } from '@/components/ui'
import { useCustomers } from '../hooks/useCustomers'
import { CustomersTable } from './CustomersTable'

/**
 * Customer directory.
 *
 * Read-only: the API exposes GET /api/customers and no write endpoint, so
 * there is no "Add customer" action here. Offering one would be a button that
 * could only ever fail. New records are inserted directly into the database
 * until the backend grows a POST.
 *
 * There is no status filter either — `customers` has no status column, and the
 * only notion of "active" anywhere in the schema is on subscriptions.
 */
export function CustomersPage() {
  const {
    customers,
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
  } = useCustomers()

  const isEmpty = !isLoading && customers.length === 0

  // Compute the visible row range for the filter summary.
  const rangeStart = filteredTotal === 0 ? 0 : (page - 1) * perPage + 1
  const rangeEnd = Math.min(page * perPage, filteredTotal)

  return (
    <>
      <PageHeader description="Companies and contacts your team supports." />

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <Input
          type="search"
          value={filters.query}
          onChange={(event) => setFilter('query', event.target.value)}
          aria-label="Search customers"
          placeholder="Search company, contact or email"
          leadingIcon={<Search className="size-4" />}
          wrapperClassName="w-full sm:w-80"
        />

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="size-4" aria-hidden="true" />
            Clear
          </Button>
        )}

        {!error && filteredTotal > 0 && (
          <p className="ml-auto text-sm whitespace-nowrap text-ink-muted">
            Showing {rangeStart}–{rangeEnd} of {filteredTotal} customers
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
        // Distinct copy for "nothing matched" vs "nothing exists" — telling a
        // user with an active search that there are no customers is misleading.
        hasActiveFilters ? (
          <EmptyState
            icon={SearchX}
            title="No matching customers"
            description="No customers match that search. Try a different company, contact or email."
            action={
              <Button size="sm" variant="secondary" onClick={resetFilters}>
                Clear search
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Customer records are managed directly in the database. Once they exist, they will appear here and in the issue and quotation forms."
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
    </>
  )
}
