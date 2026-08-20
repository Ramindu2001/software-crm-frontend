import { useState } from 'react'
import { SearchX, TriangleAlert, UserPlus } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/common'
import { Button, Pagination } from '@/components/ui'
import { useAuth } from '@/features/auth'
import { toast } from '@/lib/toastStore'
import { useLeadStats, useLeads, useLookups } from '../hooks'
import { LeadFilters } from './LeadFilters'
import { LeadPipelineBoard } from './LeadPipelineBoard'
import { LeadsTable } from './LeadsTable'
import { CaptureLeadModal } from './CaptureLeadModal'

export function LeadsPage() {
  const {
    leads,
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
  } = useLeads()

  // The board and the list are refreshed together after a capture: a new lead
  // changes both the stage counts and the rows.
  const { stats, refresh: refreshStats } = useLeadStats()
  const { owners } = useLookups({ owners: true })

  const { can } = useAuth()
  const canCreate = can('leads:create')

  const [isCaptureOpen, setIsCaptureOpen] = useState(false)

  const handleCreated = (lead) => {
    setIsCaptureOpen(false)
    // Refetch rather than splicing the row in: active filters may exclude it,
    // and the pipeline counters have moved too.
    refresh()
    refreshStats()
    // Naming the lead matters — the current filters may hide it, so the toast
    // is sometimes the only confirmation the user gets.
    toast.success('Lead captured', {
      description: `${lead.id} · ${lead.contactName}`,
    })
  }

  const isEmpty = !isLoading && leads.length === 0

  const rangeStart = filteredTotal === 0 ? 0 : (page - 1) * perPage + 1
  const rangeEnd = Math.min(page * perPage, filteredTotal)

  return (
    <>
      <PageHeader
        description="Track enquiries from the first phone call through to a won deal or a recorded loss."
        actions={
          canCreate && (
            <Button size="sm" onClick={() => setIsCaptureOpen(true)}>
              <UserPlus className="size-4" aria-hidden="true" />
              Capture lead
            </Button>
          )
        }
      />

      {/* Tiles double as filters, so a count is a way into the work rather
          than just a number to read. */}
      <LeadPipelineBoard
        stats={stats}
        activeFollowUp={filters.followUp}
        onFollowUpChange={(value) => setFilter('followUp', value)}
        activeStatus={filters.status}
        onStatusChange={(value) => setFilter('status', value)}
      />

      <LeadFilters
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
        owners={owners}
        summary={
          error
            ? null
            : filteredTotal === 0
              ? `0 of ${total} leads`
              : `Showing ${rangeStart}–${rangeEnd} of ${filteredTotal} leads`
        }
      />

      {error ? (
        <EmptyState
          icon={TriangleAlert}
          title="Couldn't load leads"
          description={error.message ?? 'Something went wrong fetching the pipeline.'}
          action={
            <Button size="sm" onClick={refresh}>
              Try again
            </Button>
          }
        />
      ) : isEmpty ? (
        // Distinct copy for "nothing matched" vs "nothing exists" — telling a
        // user with active filters that there are no leads is misleading.
        hasActiveFilters ? (
          <EmptyState
            icon={SearchX}
            title="No matching leads"
            description="No leads match the current filters. Try clearing them or broadening your search."
            action={
              <Button size="sm" variant="secondary" onClick={resetFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={UserPlus}
            title="No leads yet"
            description="When an enquiry comes in, capture the caller's name and number here and work it from there."
            action={
              canCreate && (
                <Button size="sm" onClick={() => setIsCaptureOpen(true)}>
                  Capture the first lead
                </Button>
              )
            }
          />
        )
      ) : (
        <>
          <LeadsTable
            leads={leads}
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

      {/* Mounted only while open, so each open starts from a clean form. */}
      {isCaptureOpen && (
        <CaptureLeadModal
          onClose={() => setIsCaptureOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}
