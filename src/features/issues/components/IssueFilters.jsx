import { Search, X } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from '../constants'

/**
 * Filter bar for the issue list.
 *
 * Controls use aria-label rather than visible labels: stacked labels waste
 * vertical space in a filter row, and each placeholder already states what
 * the control does.
 *
 * @param {object} props
 * @param {{query: string, status: string, priority: string, category: string}} props.filters
 * @param {(key: string, value: string) => void} props.onFilterChange
 * @param {() => void} props.onReset
 * @param {boolean} props.hasActiveFilters
 * @param {React.ReactNode} [props.summary] Result count, right-aligned.
 */
export function IssueFilters({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters,
  summary,
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
      <Input
        type="search"
        value={filters.query}
        onChange={(event) => onFilterChange('query', event.target.value)}
        aria-label="Search issues"
        placeholder="Search issues"
        leadingIcon={<Search className="size-4" />}
        wrapperClassName="w-full sm:w-72"
      />

      <Select
        value={filters.status}
        onChange={(event) => onFilterChange('status', event.target.value)}
        aria-label="Filter by status"
        placeholder="All statuses"
        options={STATUS_OPTIONS}
        wrapperClassName="w-40"
      />

      <Select
        value={filters.priority}
        onChange={(event) => onFilterChange('priority', event.target.value)}
        aria-label="Filter by priority"
        placeholder="All priorities"
        options={PRIORITY_OPTIONS}
        wrapperClassName="w-40"
      />

      <Select
        value={filters.category}
        onChange={(event) => onFilterChange('category', event.target.value)}
        aria-label="Filter by category"
        placeholder="All categories"
        options={CATEGORY_OPTIONS}
        wrapperClassName="w-40"
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X className="size-4" aria-hidden="true" />
          Clear
        </Button>
      )}

      {summary && (
        <p className="ml-auto text-sm whitespace-nowrap text-ink-muted">
          {summary}
        </p>
      )}
    </div>
  )
}
