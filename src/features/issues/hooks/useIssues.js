import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { listIssues } from '../api'
import { ANY } from '../constants'

const DEFAULT_FILTERS = { query: '', status: ANY, priority: ANY }
const DEFAULT_SORT = { by: 'updatedAt', dir: 'desc' }

/**
 * Fetches and manages the issue list, including filters and sorting.
 *
 * Filtering and sorting are sent to the API rather than applied to the
 * response, matching how a paginated backend behaves — so swapping the mock
 * for HTTP won't change this hook's shape.
 */
export function useIssues() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sort, setSort] = useState(DEFAULT_SORT)
  // Bumped to force a refetch after a mutation.
  const [nonce, setNonce] = useState(0)

  // The typed value drives the input immediately; only the settled value
  // triggers a request.
  const debouncedQuery = useDebouncedValue(filters.query, 300)

  const request = useMemo(
    () => ({
      query: debouncedQuery,
      status: filters.status,
      priority: filters.priority,
      sortBy: sort.by,
      sortDir: sort.dir,
      nonce,
    }),
    [debouncedQuery, filters.status, filters.priority, sort.by, sort.dir, nonce],
  )

  const [result, setResult] = useState({
    request: null,
    data: [],
    total: 0,
    filteredTotal: 0,
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
    filters.priority !== ANY

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
  }
}
