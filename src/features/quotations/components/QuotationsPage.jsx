import { Link, useNavigate } from 'react-router-dom'
import { FileText, Plus, Search, SearchX, TriangleAlert, X } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/common'
import { Button, Input, Pagination, Select } from '@/components/ui'
import { PERMISSIONS, useAuth } from '@/features/auth'
import { useQuotations } from '../hooks'
import { QUOTATION_STATUS_OPTIONS } from '../constants'
import { QuotationsTable } from './QuotationsTable'

/**
 * Quotation management.
 *
 * Search covers the customer's company name, contact person and the reference
 * itself — a customer quoting "260815-075" back at you should find it, which
 * is the most common way anyone looks a quotation up.
 */
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

  const navigate = useNavigate()
  const { can } = useAuth()
  const canCreate = can(PERMISSIONS.QUOTATIONS_CREATE)

  const isEmpty = !isLoading && quotations.length === 0

  const rangeStart = filteredTotal === 0 ? 0 : (page - 1) * perPage + 1
  const rangeEnd = Math.min(page * perPage, filteredTotal)

  return (
    <>
      <PageHeader
        description="Quotations raised for customers, priced from the catalogue."
        actions={
          canCreate && (
            <Button size="sm" onClick={() => navigate('/quotations/new')}>
              <Plus className="mr-1.5 size-4" aria-hidden="true" />
              New quotation
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
          placeholder="Search customer or reference"
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
        // Distinct copy for "nothing matched" vs "nothing exists" — telling a
        // user with active filters that there are no quotations is misleading.
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
            description="Pick a customer, a product and a package, and the quotation builds itself from the catalogue."
            action={
              canCreate && (
                <Button as={Link} to="/quotations/new" size="sm">
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
            canEdit={canCreate}
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
