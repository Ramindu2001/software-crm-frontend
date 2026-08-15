import { useCallback, useEffect, useMemo, useState } from 'react'
import { getQuotation, NotFoundError } from '../api'

/**
 * Loads one quotation in full — snapshot line items, terms, and the live
 * company letterhead. One request renders the whole printable document.
 *
 * Loading is derived from request identity rather than stored, so there is no
 * setState in the effect body and no cascading render on every fetch.
 *
 * @param {number|string|null} id Numeric id or "260815-075". null skips.
 */
export function useQuotation(id) {
  const [nonce, setNonce] = useState(0)
  const request = useMemo(() => ({ id, nonce }), [id, nonce])

  const [result, setResult] = useState({
    request: null,
    quotation: null,
    error: null,
  })

  const isLoading = Boolean(id) && result.request !== request

  useEffect(() => {
    // Nothing to fetch, and nothing to clear: with no id the values below are
    // derived as null rather than stored, so there is no stale state to reset.
    if (!request.id) return undefined

    let ignore = false
    const controller = new AbortController()

    getQuotation(request.id, { signal: controller.signal })
      .then((quotation) => {
        if (!ignore) setResult({ request, quotation, error: null })
      })
      .catch((error) => {
        if (ignore || error.isCancelled) return
        setResult({ request, quotation: null, error })
      })

    return () => {
      ignore = true
      controller.abort()
    }
  }, [request])

  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  /** Replace the cached record without a refetch, after a mutation returns. */
  const applyQuotation = useCallback((quotation) => {
    setResult((current) => ({ ...current, quotation }))
  }, [])

  // Derived rather than stored, so passing id = null needs no state write.
  const quotation = id ? result.quotation : null
  const error = id ? result.error : null

  return {
    quotation,
    isLoading,
    error,
    isNotFound: error instanceof NotFoundError,
    refresh,
    applyQuotation,
  }
}
