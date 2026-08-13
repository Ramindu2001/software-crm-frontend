import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { listQuotations } from '../api'

const DEFAULT_FILTERS = { query: '', status: '' }
const DEFAULT_SORT = { by: 'updatedAt', dir: 'desc' }
const PER_PAGE = 10

export function useQuotations() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sort, setSort] = useState(DEFAULT_SORT)
  const [page, setPage] = useState(1)
  const [nonce, setNonce] = useState(0)

  const debouncedQuery = useDebouncedValue(filters.query, 300)

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setPage(1)
  }, [debouncedQuery, filters.status, sort.by, sort.dir])

  const request = useMemo(
    () => ({
      query: debouncedQuery,
      status: filters.status,
      sortBy: sort.by,
      sortDir: sort.dir,
      page,
      perPage: PER_PAGE,
      nonce,
    }),
    [debouncedQuery, filters.status, sort.by, sort.dir, page, nonce],
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

    listQuotations(request)
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

  const hasActiveFilters =
    filters.query !== '' ||
    filters.status !== ''

  return {
    quotations: result.data,
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
