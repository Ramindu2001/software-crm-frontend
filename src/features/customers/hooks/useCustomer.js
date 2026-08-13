import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCustomer } from '../api'

/**
 * Fetches a single customer by id.
 *
 * @param {number|string} id
 */
export function useCustomer(id) {
  const [nonce, setNonce] = useState(0)
  const request = useMemo(() => ({ id, nonce }), [id, nonce])

  const [result, setResult] = useState({
    request: null,
    customer: null,
    error: null,
  })

  const isLoading = result.request !== request

  useEffect(() => {
    let ignore = false

    getCustomer(request.id)
      .then((customer) => {
        if (!ignore) setResult({ request, customer, error: null })
      })
      .catch((error) => {
        if (!ignore) setResult({ request, customer: null, error })
      })

    return () => {
      ignore = true
    }
  }, [request])

  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  /**
   * Replace the cached customer without a refetch — used after a mutation
   * returns the updated record.
   */
  const applyCustomer = useCallback((customer) => {
    setResult((current) => ({ ...current, customer }))
  }, [])

  return { customer: result.customer, isLoading, error: result.error, refresh, applyCustomer }
}
