import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { listIssues } from '../api'
import { ANY } from '../constants'

const DEFAULT_FILTERS = { query: '', status: ANY, priority: ANY, category: ANY }
// Tickets have no `updated_at` column, so newest-first is the only sensible
// default and `createdAt` is what the API will sort by.
const DEFAULT_SORT = { by: 'createdAt', dir: 'desc' }
const PER_PAGE = 10

/**
 * Fetches and manages the issue list, including filters, sorting and pagination.
 *
 * Filtering, sorting and pagination are sent to the API rather than applied to
 * the response, matching how a paginated backend behaves — so swapping the mock
 * for HTTP won't change this hook's shape.
 */
export function useIssues() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sort, setSort] = useState(DEFAULT_SORT)
  const [page, setPage] = useState(1)
  // Bumped to force a refetch after a mutation.
  const [nonce, setNonce] = useState(0)

  // The typed value drives the input immediately; only the settled value
  // triggers a request.
  const debouncedQuery = useDebouncedValue(filters.query, 300)

  // Reset to page 1 whenever any filter or sort value changes. A ref tracks
  // whether the effect is running for the first time so we don't clobber the
  // initial page value on mount.
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setPage(1)
  }, [
    debouncedQuery,
    filters.status,
    filters.priority,
    filters.category,
    sort.by,
    sort.dir,
  ])

  const request = useMemo(
    () => ({
      query: debouncedQuery,
      status: filters.status,
      priority: filters.priority,
      category: filters.category,
      sortBy: sort.by,
      sortDir: sort.dir,
      page,
      perPage: PER_PAGE,
      nonce,
    }),
    [
      debouncedQuery,
      filters.status,
      filters.priority,
      filters.category,
      sort.by,
      sort.dir,
      page,
      nonce,
    ],
  )

  const [result, setResult] = useState({
    request: null,
    data: [],
    total: 0,
    filteredTotal: 0,
    currentPage: 1,
    lastPage: 1,
    perPage: PER_PAGE,
    error: null,
  })

  // Derived rather than stored: no setState-in-effect cascade, and the
  // previous rows stay on screen while a new request is in flight instead of
  // the table flashing empty on every keystroke.
  const isLoading = result.request !== request

  useEffect(() => {
    // Guards against out-of-order responses clobbering newer results when
    // filters change faster than requests resolve.
    let ignore = false

    listIssues(request)
      .then((response) => {
        if (ignore) return
        setResult({
          request,
          data: response.data,
          total: response.total,
          filteredTotal: response.filteredTotal,
          currentPage: response.currentPage,
          lastPage: response.lastPage,
          perPage: response.perPage,
          error: null,
        })
      })
      .catch((error) => {
        if (ignore) return
        setResult({
          request,
          data: [],
          total: 0,
          filteredTotal: 0,
          currentPage: 1,
          lastPage: 1,
          perPage: PER_PAGE,
          error,
        })
      })

    return () => {
      ignore = true
    }
  }, [request])

  const setFilter = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [])

  /** First click sorts ascending; clicking the active column flips direction. */
  const toggleSort = useCallback((field) => {
    setSort((current) =>
      current.by === field
        ? { by: field, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { by: field, dir: 'asc' },
    )
  }, [])

  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  const hasActiveFilters =
    filters.query !== '' ||
    filters.status !== ANY ||
    filters.priority !== ANY ||
    filters.category !== ANY

  return {
    issues: result.data,
    error: result.error,
    isLoading,
    total: result.total,
    filteredTotal: result.filteredTotal,
    filters,
    sort,
    hasActiveFilters,
    setFilter,
    resetFilters,
    toggleSort,
    refresh,
    // Pagination
    page: result.currentPage,
    lastPage: result.lastPage,
    perPage: result.perPage,
    setPage,
  }
}
