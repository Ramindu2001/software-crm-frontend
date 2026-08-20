import { useRef, useState } from 'react'
import { Search, SlidersHorizontal, UserRound, X } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import {
  FOLLOW_UP_FILTER,
  LEAD_SOLUTION_TYPE,
  LEAD_SOURCE,
  LEAD_STATUS,
  SOLUTION_TYPE_OPTIONS,
  SOURCE_OPTIONS,
} from '../constants'

/**
 * Search, scope, and the filters that are not worth permanent space.
 *
 * ── What changed, and why ──
 * This used to be six equally-weighted dropdowns in one wrapping row, two of
 * which duplicated the tile board above it. Now:
 *
 * · Stage and follow-up are gone from here entirely — they live in the work
 *   queue strip, which is the one place either can be set.
 * · Search and "Mine" stay on the bar, because they are what people reach for
 *   constantly.
 * · Source and solution type moved into a popover. They are real filters and
 *   occasionally necessary, but they were costing two permanent controls'
 *   worth of attention to serve a fraction of the traffic.
 * · Every filter in force — including the ones set from the strip above —
 *   renders as a removable chip. Previously the only way to tell what was
 *   applied was to read six dropdowns and a tile board and reconcile them.
 *
 * The search placeholder names the phone number on purpose. It is the field
 * people reach for — a number rings back and the rep needs to know whether
 * we have spoken before — and the API matches it with punctuation stripped,
 * so digits read off a caller ID find a lead stored as "+94 77 123 4567".
 */

function FilterChip({ label, value, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pr-1 pl-2.5 text-xs text-brand-700">
      {label && <span className="text-brand-700/70">{label}</span>}
      <span className="font-medium">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label ? `${label} ` : ''}${value}`}
        className="grid size-4 place-items-center rounded-full transition-colors hover:bg-brand-200"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  )
}

/** A toggle that reads as pressed or not, for the two binary scopes. */
function ToggleButton({ icon: Icon, label, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        isActive
          ? 'bg-brand-600 text-ink-inverse hover:bg-brand-700'
          : 'bg-surface text-ink ring-1 ring-line hover:bg-sunken',
      )}
    >
      {Icon && <Icon className="size-4" aria-hidden="true" />}
      {label}
    </button>
  )
}

/**
 * @param {object} props
 * @param {object} props.filters
 * @param {(key: string, value: string) => void} props.onFilterChange
 * @param {() => void} props.onReset
 * @param {boolean} props.hasActiveFilters
 * @param {Array<{value: string, label: string}>} [props.owners]
 * @param {string|number} [props.currentUserId] Powers the "Mine" toggle.
 * @param {React.ReactNode} [props.summary] Result count, right-aligned.
 */
export function LeadFilters({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters,
  owners = [],
  currentUserId,
  summary,
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const popoverRef = useRef(null)

  useClickOutside(popoverRef, () => setIsPopoverOpen(false), isPopoverOpen)
  useEscapeKey(() => setIsPopoverOpen(false), isPopoverOpen)

  const mineValue = currentUserId != null ? String(currentUserId) : ''
  const isMine = Boolean(mineValue) && filters.ownerId === mineValue

  // The count on the "Filters" button, so a filter tucked away in a popover
  // can never be silently narrowing the list.
  const popoverCount = [filters.source, filters.solutionType].filter(Boolean).length

  const ownerLabel = owners.find((o) => o.value === filters.ownerId)?.label

  /** Everything currently narrowing the list, wherever it was set from. */
  const chips = [
    filters.status && {
      key: 'status',
      label: 'Stage',
      value: LEAD_STATUS[filters.status]?.label ?? filters.status,
    },
    filters.followUp && {
      key: 'followUp',
      value: FOLLOW_UP_FILTER[filters.followUp]?.label ?? filters.followUp,
    },
    filters.solutionType && {
      key: 'solutionType',
      value: LEAD_SOLUTION_TYPE[filters.solutionType]?.label ?? filters.solutionType,
    },
    filters.source && {
      key: 'source',
      label: 'Source',
      value: LEAD_SOURCE[filters.source]?.label ?? filters.source,
    },
    // Suppressed while the Mine toggle is lit — the toggle already says so, and
    // two controls for one filter is the problem this redesign set out to fix.
    filters.ownerId &&
      !isMine && {
        key: 'ownerId',
        label: 'Owner',
        value: ownerLabel ?? filters.ownerId,
      },
  ].filter(Boolean)

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={filters.query}
          onChange={(event) => onFilterChange('query', event.target.value)}
          aria-label="Search leads by name, company, phone or email"
          placeholder="Search name, phone, company…"
          leadingIcon={<Search className="size-4" />}
          wrapperClassName="w-full sm:w-80"
        />

        {/* Only meaningful when we know who is signed in and there is more
            than one person leads could belong to. */}
        {mineValue && owners.length > 1 && (
          <ToggleButton
            icon={UserRound}
            label="My leads"
            isActive={isMine}
            onClick={() => onFilterChange('ownerId', isMine ? '' : mineValue)}
          />
        )}

        <div ref={popoverRef} className="relative">
          <button
            type="button"
            onClick={() => setIsPopoverOpen((open) => !open)}
            aria-expanded={isPopoverOpen}
            aria-haspopup="dialog"
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
              'bg-surface text-ink ring-1 ring-line hover:bg-sunken',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
              isPopoverOpen && 'bg-sunken',
            )}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters
            {popoverCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-brand-600 text-[11px] font-semibold text-ink-inverse">
                {popoverCount}
              </span>
            )}
          </button>

          {isPopoverOpen && (
            <div
              role="dialog"
              aria-label="More filters"
              className="absolute top-full right-0 z-30 mt-2 w-72 animate-panel-in rounded-card bg-surface p-4 shadow-panel ring-1 ring-line"
            >
              <div className="flex flex-col gap-3">
                <Select
                  label="Solution type"
                  value={filters.solutionType}
                  onChange={(event) =>
                    onFilterChange('solutionType', event.target.value)
                  }
                  placeholder="Any solution"
                  options={SOLUTION_TYPE_OPTIONS}
                />

                <Select
                  label="Source"
                  value={filters.source}
                  onChange={(event) => onFilterChange('source', event.target.value)}
                  placeholder="Any source"
                  options={SOURCE_OPTIONS}
                />

                {owners.length > 1 && (
                  <Select
                    label="Owner"
                    value={filters.ownerId}
                    onChange={(event) =>
                      onFilterChange('ownerId', event.target.value)
                    }
                    placeholder="Anyone"
                    options={owners}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {summary && (
          <p className="ml-auto hidden text-sm whitespace-nowrap text-ink-muted sm:block">
            {summary}
          </p>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              value={chip.value}
              onRemove={() => onFilterChange(chip.key, '')}
            />
          ))}

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
