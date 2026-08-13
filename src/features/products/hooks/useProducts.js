import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { listProducts } from '../api'

const DEFAULT_FILTERS = { query: '' }
const PER_PAGE = 10

export function useProducts() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
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
  }, [debouncedQuery])

  const request = useMemo(
    () => ({
      query: debouncedQuery,
      page,
      perPage: PER_PAGE,
      nonce,
    }),
    [debouncedQuery, page, nonce],
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

    listProducts(request)
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

  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  const hasActiveFilters = filters.query !== ''

  return {
    products: result.data,
    error: result.error,
    isLoading,
    total: result.total,
    filteredTotal: result.filteredTotal,
    filters,
    hasActiveFilters,
    setFilter,
    resetFilters,
    refresh,
    page: result.currentPage,
    lastPage: result.lastPage,
    perPage: result.perPage,
    setPage,
  }
}
