import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { listUsers } from '../api'

// 'all' rather than the endpoint's 'active' default: this drives the admin
// directory, where the whole point is seeing deactivated accounts too.
const DEFAULT_FILTERS = { query: '', role: '', status: 'all' }
const DEFAULT_SORT = { by: 'name', dir: 'asc' }
const PER_PAGE = 10

/**
 * Fetches and manages the user directory, including filters, sorting and
 * pagination.
 *
 * Mirrors useIssues and useCustomers: the request is sent to the API rather
 * than applied to the response, so nothing here changes if the endpoint ever
 * grows real server-side paging.
 */
export function useUsers() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sort, setSort] = useState(DEFAULT_SORT)
  const [page, setPage] = useState(1)
  // Bumped to force a refetch after a mutation.
  const [nonce, setNonce] = useState(0)

  const debouncedQuery = useDebouncedValue(filters.query, 300)

  // Reset to page 1 whenever any filter or sort value changes. A ref tracks
  // the first run so we don't clobber the initial page on mount.
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setPage(1)
  }, [debouncedQuery, filters.role, filters.status, sort.by, sort.dir])

  const request = useMemo(
    () => ({
      query: debouncedQuery,
      role: filters.role,
      status: filters.status,
      sortBy: sort.by,
      sortDir: sort.dir,
      page,
      perPage: PER_PAGE,
      nonce,
    }),
    [debouncedQuery, filters.role, filters.status, sort.by, sort.dir, page, nonce],
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

  // Derived rather than stored: the previous rows stay on screen while a new
  // request is in flight, instead of the table flashing empty on every
  // keystroke.
  const isLoading = result.request !== request

  useEffect(() => {
    // Guards against out-of-order responses clobbering newer results.
    let ignore = false

    listUsers(request)
      .then((response) => {
        if (ignore) return
        setResult({ request, ...response, error: null })
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
    filters.role !== '' ||
    filters.status !== DEFAULT_FILTERS.status

  return {
    users: result.data,
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
