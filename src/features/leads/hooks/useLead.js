import { useCallback, useEffect, useMemo, useState } from 'react'
import { getLead } from '../api'

/**
 * Fetches a single lead with its activity log and requirements.
 *
 * Every lead mutation on the server answers with the whole updated record, so
 * `applyLead` exists to swallow that response directly. The detail page runs
 * six different mutations; refetching after each would be six wasted round
 * trips for data the server already sent back.
 *
 * @param {string} id "LED-260819-007" or "7".
 */
export function useLead(id) {
  const [nonce, setNonce] = useState(0)
  const request = useMemo(() => ({ id, nonce }), [id, nonce])

  const [result, setResult] = useState({
    request: null,
    lead: null,
    error: null,
  })

  const isLoading = result.request !== request

  useEffect(() => {
    let ignore = false

    getLead(request.id)
      .then((lead) => {
        if (!ignore) setResult({ request, lead, error: null })
      })
      .catch((error) => {
        if (!ignore) setResult({ request, lead: null, error })
      })

    return () => {
      ignore = true
    }
  }, [request])

  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  /** Replace the cached lead with what a mutation just returned. */
  const applyLead = useCallback((lead) => {
    setResult((current) => ({ ...current, lead, error: null }))
  }, [])

  return {
    lead: result.lead,
    isLoading,
    error: result.error,
    isNotFound: result.error?.status === 404,
    refresh,
    applyLead,
  }
}
