import { useCallback, useEffect, useMemo, useState } from 'react'
import { getQuotation } from '../api'

export function useQuotation(id) {
  const [nonce, setNonce] = useState(0)
  const request = useMemo(() => ({ id, nonce }), [id, nonce])

  const [result, setResult] = useState({
    request: null,
    quotation: null,
    error: null,
  })

  const isLoading = result.request !== request

  useEffect(() => {
    let ignore = false

    getQuotation(request.id)
      .then((quotation) => {
        if (!ignore) setResult({ request, quotation, error: null })
      })
      .catch((error) => {
        if (!ignore) setResult({ request, quotation: null, error })
      })

    return () => {
      ignore = true
    }
  }, [request])

  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  const applyQuotation = useCallback((quotation) => {
    setResult((current) => ({ ...current, quotation }))
  }, [])

  return { quotation: result.quotation, isLoading, error: result.error, refresh, applyQuotation }
}
