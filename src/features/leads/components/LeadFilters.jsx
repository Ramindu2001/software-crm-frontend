import { Search, X } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import {
  FOLLOW_UP_OPTIONS,
  SOLUTION_TYPE_OPTIONS,
  SOURCE_OPTIONS,
  STATUS_OPTIONS,
} from '../constants'

/**
 * Filter bar for the lead pipeline.
 *
 * Controls use aria-label rather than visible labels: stacked labels waste
 * vertical space in a filter row, and each placeholder already states what the
 * control does.
 *
 * The search placeholder names the phone number specifically. It is the field
 * people will reach for — a number rings back and the rep needs to know
 * whether we have spoken before — and the API matches it with punctuation
 * stripped, so digits read straight off a caller ID find a lead stored as
 * "+94 77 123 4567".
 *
 * @param {object} props
 * @param {object} props.filters
 * @param {(key: string, value: string) => void} props.onFilterChange
 * @param {() => void} props.onReset
 * @param {boolean} props.hasActiveFilters
 * @param {Array<{value: string, label: string}>} [props.owners]
 * @param {React.ReactNode} [props.summary] Result count, right-aligned.
 */
export function LeadFilters({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters,
  owners = [],
  summary,
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
      <Input
        type="search"
        value={filters.query}
        onChange={(event) => onFilterChange('query', event.target.value)}
        aria-label="Search leads by name, company, phone or email"
        placeholder="Search name, phone, company…"
        leadingIcon={<Search className="size-4" />}
        wrapperClassName="w-full sm:w-72"
      />

      <Select
        value={filters.status}
        onChange={(event) => onFilterChange('status', event.target.value)}
        aria-label="Filter by pipeline stage"
        placeholder="All stages"
        options={STATUS_OPTIONS}
        wrapperClassName="w-44"
      />

      <Select
        value={filters.solutionType}
        onChange={(event) => onFilterChange('solutionType', event.target.value)}
        aria-label="Filter by solution type"
        placeholder="Any solution"
        options={SOLUTION_TYPE_OPTIONS}
        wrapperClassName="w-44"
      />

      <Select
        value={filters.followUp}
        onChange={(event) => onFilterChange('followUp', event.target.value)}
        aria-label="Filter by follow-up"
        placeholder="Any follow-up"
        options={FOLLOW_UP_OPTIONS}
        wrapperClassName="w-40"
      />

      <Select
        value={filters.source}
        onChange={(event) => onFilterChange('source', event.target.value)}
        aria-label="Filter by source"
        placeholder="Any source"
        options={SOURCE_OPTIONS}
        wrapperClassName="w-36"
      />

      {/* Only worth rendering once there is more than one person to pick. */}
      {owners.length > 1 && (
        <Select
          value={filters.ownerId}
          onChange={(event) => onFilterChange('ownerId', event.target.value)}
          aria-label="Filter by owner"
          placeholder="Anyone"
          options={owners}
          wrapperClassName="w-40"
        />
      )}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X className="size-4" aria-hidden="true" />
          Clear
        </Button>
      )}

      {summary && (
        <p className="ml-auto text-sm whitespace-nowrap text-ink-muted">{summary}</p>
      )}
    </div>
  )
}
