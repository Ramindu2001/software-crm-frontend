import { useCallback, useEffect, useMemo, useState } from 'react'
import { getIssue } from '../api'

/**
 * Fetches a single issue by id.
 *
 * @param {string} id
 */
export function useIssue(id) {
  const [nonce, setNonce] = useState(0)
  const request = useMemo(() => ({ id, nonce }), [id, nonce])

  const [result, setResult] = useState({
    request: null,
    issue: null,
    error: null,
  })

  const isLoading = result.request !== request

  useEffect(() => {
    let ignore = false

    getIssue(request.id)
      .then((issue) => {
        if (!ignore) setResult({ request, issue, error: null })
      })
      .catch((error) => {
        if (!ignore) setResult({ request, issue: null, error })
      })

    return () => {
      ignore = true
    }
  }, [request])

  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  /**
   * Replace the cached issue without a refetch — used after a mutation
   * returns the updated record.
   */
  const applyIssue = useCallback((issue) => {
    setResult((current) => ({ ...current, issue }))
  }, [])

  return { issue: result.issue, isLoading, error: result.error, refresh, applyIssue }
}
