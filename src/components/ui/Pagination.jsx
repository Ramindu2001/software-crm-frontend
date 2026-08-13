import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const BTN_BASE =
  'inline-flex items-center justify-center rounded-lg text-sm font-medium ' +
  'transition-colors select-none h-9 min-w-9 px-2'

const BTN_PAGE =
  'text-ink-muted hover:bg-sunken hover:text-ink active:bg-line'

const BTN_ACTIVE =
  'bg-brand-600 text-ink-inverse hover:bg-brand-700 active:bg-brand-800 shadow-sm'

const BTN_NAV =
  'text-ink-muted hover:bg-sunken hover:text-ink active:bg-line ' +
  'disabled:pointer-events-none disabled:opacity-40'

/**
 * Builds the array of page numbers and ellipsis markers to render.
 *
 * Always shows the first and last page, plus a window of `siblings` pages
 * around the current page. Gaps are filled with `'…'`.
 *
 * @param {number} current  1-indexed current page
 * @param {number} last     Total number of pages
 * @param {number} siblings Number of pages to show on each side of current
 * @returns {Array<number|string>}
 */
function getPageRange(current, last, siblings = 1) {
  // Small page counts → show every page, no ellipsis needed.
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1)
  }

  const left = Math.max(2, current - siblings)
  const right = Math.min(last - 1, current + siblings)

  const showLeftEllipsis = left > 2
  const showRightEllipsis = right < last - 1

  const range = []
  range.push(1)

  if (showLeftEllipsis) {
    range.push('left-ellipsis')
  } else {
    // Fill pages between 1 and the window start.
    for (let i = 2; i < left; i++) range.push(i)
  }

  for (let i = left; i <= right; i++) range.push(i)

  if (showRightEllipsis) {
    range.push('right-ellipsis')
  } else {
    // Fill pages between the window end and the last page.
    for (let i = right + 1; i < last; i++) range.push(i)
  }

  range.push(last)

  return range
}

/**
 * Page navigation controls with Previous/Next, numbered pages and smart
 * ellipsis.
 *
 * Renders nothing when `lastPage <= 1` — there's no reason to show pagination
 * for a single page of results.
 *
 * @param {object} props
 * @param {number}  props.currentPage  Active page (1-indexed).
 * @param {number}  props.lastPage     Total pages.
 * @param {(page: number) => void} props.onPageChange Called with the new page.
 * @param {string}  [props.className]
 */
export function Pagination({ currentPage, lastPage, onPageChange, className }) {
  if (lastPage <= 1) return null

  const pages = getPageRange(currentPage, lastPage)
  const isFirst = currentPage === 1
  const isLast = currentPage === lastPage

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-2', className)}
    >
      {/* sr-only summary for assistive tech */}
      <span className="sr-only">
        Page {currentPage} of {lastPage}
      </span>

      {/* Previous */}
      <button
        type="button"
        disabled={isFirst}
        onClick={() => onPageChange(currentPage - 1)}
        className={cn(BTN_BASE, BTN_NAV, 'gap-1')}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Page numbers */}
      <div className="flex items-center gap-1" role="list">
        {pages.map((item) => {
          if (typeof item === 'string') {
            // Ellipsis
            return (
              <span
                key={item}
                role="listitem"
                className="inline-flex h-9 min-w-9 items-center justify-center text-sm text-ink-subtle select-none"
                aria-hidden="true"
              >
                …
              </span>
            )
          }

          const isCurrent = item === currentPage
          return (
            <button
              key={item}
              type="button"
              role="listitem"
              onClick={() => onPageChange(item)}
              aria-label={`Go to page ${item}`}
              aria-current={isCurrent ? 'page' : undefined}
              className={cn(BTN_BASE, isCurrent ? BTN_ACTIVE : BTN_PAGE)}
            >
              {item}
            </button>
          )
        })}
      </div>

      {/* Next */}
      <button
        type="button"
        disabled={isLast}
        onClick={() => onPageChange(currentPage + 1)}
        className={cn(BTN_BASE, BTN_NAV, 'gap-1')}
        aria-label="Go to next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  )
}
