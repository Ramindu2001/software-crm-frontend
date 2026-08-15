import { useCallback, useEffect, useMemo, useState } from 'react'
import { getCompanySettings } from '../api'

/**
 * Loads the company letterhead and default terms.
 *
 * Used by both the settings form and the quotation builder — the builder needs
 * the default payment terms and T&C to seed a new quotation, and the validity
 * period to show when the offer expires.
 *
 * Loading is derived from request identity rather than stored, so there is no
 * setState in the effect body and no cascading render on every fetch.
 */
export function useCompanySettings() {
  const [nonce, setNonce] = useState(0)
  const request = useMemo(() => ({ nonce }), [nonce])

  const [result, setResult] = useState({
    request: null,
    settings: null,
    error: null,
  })

  const isLoading = result.request !== request

  useEffect(() => {
    let ignore = false

    getCompanySettings()
      .then((settings) => {
        if (!ignore) setResult({ request, settings, error: null })
      })
      .catch((error) => {
        if (!ignore) setResult({ request, settings: null, error })
      })

    return () => {
      ignore = true
    }
  }, [request])

  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  /** Replace the cached settings without a refetch, after a save returns. */
  const applySettings = useCallback((settings) => {
    setResult((current) => ({ ...current, settings }))
  }, [])

  return {
    settings: result.settings,
    isLoading,
    error: result.error,
    refresh,
    applySettings,
  }
}
