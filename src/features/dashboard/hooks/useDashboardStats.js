import { useEffect, useState, useCallback } from 'react'
import { getDashboardStats } from '../api'

export function useDashboardStats() {
  const [nonce, setNonce] = useState(0)
  
  const [result, setResult] = useState({
    data: null,
    error: null,
  })

  const isLoading = !result.data && !result.error

  useEffect(() => {
    let ignore = false
    const controller = new AbortController()

    getDashboardStats({ signal: controller.signal })
      .then((data) => {
        if (!ignore) setResult({ data, error: null })
      })
      .catch((error) => {
        if (!ignore && !error.isCancelled) setResult({ data: null, error })
      })

    return () => {
      ignore = true
      controller.abort()
    }
  }, [nonce])

  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  return {
    stats: result.data?.stats,
    recentIssues: result.data?.recentIssues,
    recentQuotations: result.data?.recentQuotations,
    isLoading,
    error: result.error,
    refresh,
  }
}
