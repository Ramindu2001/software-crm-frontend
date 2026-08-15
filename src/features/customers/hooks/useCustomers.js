import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { listCustomers } from '../api'

// No status filter: `customers` has no status column, and the endpoint
// supports only a free-text search.
const DEFAULT_FILTERS = { query: '' }
// Alphabetical by company, because that is how a directory is read — and the
// API has no updated timestamp to sort by.
const DEFAULT_SORT = { by: 'name', dir: 'asc' }
const PER_PAGE = 10

/**
 * Fetches and manages the customer list, including filters, sorting and
 * pagination.
 *
 * Mirrors useIssues: filtering, sorting and pagination are sent to the API
 * rather than applied client-side, so swapping the mock for HTTP won't change
 * this hook's shape.
 */
export function useCustomers() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sort, setSort] = useState(DEFAULT_SORT)
  const [page, setPage] = useState(1)
  const [nonce, setNonce] = useState(0)

  const debouncedQuery = useDebouncedValue(filters.query, 300)

  // Reset to page 1 whenever any filter or sort value changes.
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setPage(1)
  }, [debouncedQuery, sort.by, sort.dir])

  const request = useMemo(
    () => ({
      query: debouncedQuery,
      sortBy: sort.by,
      sortDir: sort.dir,
      page,
      perPage: PER_PAGE,
      nonce,
    }),
    [debouncedQuery, sort.by, sort.dir, page, nonce],
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

  const isLoading = result.request !== request

  useEffect(() => {
    let ignore = false

    listCustomers(request)
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

  const toggleSort = useCallback((field) => {
    setSort((current) =>
      current.by === field
        ? { by: field, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { by: field, dir: 'asc' },
    )
  }, [])

  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  const hasActiveFilters = filters.query !== ''

  return {
    customers: result.data,
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
    page: result.currentPage,
    lastPage: result.lastPage,
    perPage: result.perPage,
    setPage,
  }
}
