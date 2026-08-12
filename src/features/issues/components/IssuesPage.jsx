import { useState } from 'react'
import { CircleDot, SearchX, TriangleAlert } from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/common'
import { Button } from '@/components/ui'
import { useIssues } from '../hooks/useIssues'
import { IssueFilters } from './IssueFilters'
import { IssuesTable } from './IssuesTable'
import { CreateIssueModal } from './CreateIssueModal'

export function IssuesPage() {
  const {
    issues,
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
  } = useIssues()

  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const handleCreated = () => {
    setIsCreateOpen(false)
    // Refetch so the new issue appears under the current filters and sort,
    // rather than being spliced in where it may not belong.
    refresh()
  }

  const isEmpty = !isLoading && issues.length === 0

  return (
    <>
      <PageHeader
        description="Track, triage and resolve reported issues."
        actions={
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            New issue
          </Button>
        }
      />

      <IssueFilters
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
        summary={
          error ? null : `Showing ${filteredTotal} of ${total} issues`
        }
      />

      {error ? (
        <EmptyState
          icon={TriangleAlert}
          title="Couldn't load issues"
          description={error.message ?? 'Something went wrong fetching issues.'}
          action={
            <Button size="sm" onClick={refresh}>
              Try again
            </Button>
          }
        />
      ) : isEmpty ? (
        // Distinct copy for "nothing matched" vs "nothing exists" — telling a
        // user with active filters that there are no issues is misleading.
        hasActiveFilters ? (
          <EmptyState
            icon={SearchX}
            title="No matching issues"
            description="No issues match the current filters. Try clearing them or broadening your search."
            action={
              <Button size="sm" variant="secondary" onClick={resetFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={CircleDot}
            title="No issues yet"
            description="Reported issues will appear here as your team logs them."
            action={
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                Create the first issue
              </Button>
            }
          />
        )
      ) : (
        <IssuesTable
          issues={issues}
          sort={sort}
          onToggleSort={toggleSort}
          isLoading={isLoading}
        />
      )}

      {/* Mounted only while open, so each open starts from a clean form. */}
      {isCreateOpen && (
        <CreateIssueModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}
