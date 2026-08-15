import { useState } from 'react'
import { Search, SearchX, TriangleAlert, Users, X } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/common'
import { Button, Input, Pagination } from '@/components/ui'
import { useAuth } from '@/features/auth'
import { toast } from '@/lib/toastStore'
import { useCustomers } from '../hooks/useCustomers'
import { CustomersTable } from './CustomersTable'
import { CustomerFormModal } from './CustomerFormModal'

/**
 * Customer directory.
 *
 * There is no status filter: `customers` has no status column, and the only
 * notion of "active" anywhere in the schema is on subscriptions. Search covers
 * company, contact and email — not address, which the API returns but
 * deliberately does not search, since free text would match half the list on a
 * city name.
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

  // POST and PUT are Admin/Support — Developers see customers on their tickets
  // but do not own the record.
  const { can } = useAuth()
  const canWrite = can('customers:write')

  // null = closed. { customer: undefined } opens create; a record opens edit.
  const [formState, setFormState] = useState(null)

  const handleSaved = (customer, mode) => {
    setFormState(null)
    // Refetch so the row lands in the right place under the current search and
    // sort, rather than being spliced in where it may not belong.
    refresh()
    toast.success(mode === 'edit' ? 'Customer updated' : 'Customer added', {
      // Naming it matters: an active search may exclude the row, so the toast
      // is sometimes the only confirmation the user gets.
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
        description="Companies and contacts your team supports."
        actions={
          canWrite && (
            <Button size="sm" onClick={() => setFormState({ customer: undefined })}>
              Add customer
            </Button>
          )
        }
      />

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
            description="Add a customer and they become available on the issue and quotation forms."
            action={
              canWrite && (
                <Button size="sm" onClick={() => setFormState({ customer: undefined })}>
                  Add the first customer
                </Button>
              )
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
            canEdit={canWrite}
            onEdit={(customer) => setFormState({ customer })}
          />

          <Pagination
            currentPage={page}
            lastPage={lastPage}
            onPageChange={setPage}
            className="mt-4"
          />
        </>
      )}

      {/* Mounted only while open, so each open starts from the record as it
          currently stands rather than a stale draft. */}
      {formState && (
        <CustomerFormModal
          customer={formState.customer}
          onClose={() => setFormState(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
