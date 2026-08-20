import { useCallback, useEffect, useMemo, useState } from 'react'
import { getLeadStats } from '../api'

const EMPTY = {
  byStatus: {},
  bySolutionType: {},
  followUps: { overdue: 0, dueToday: 0, unscheduled: 0 },
  openTotal: 0,
  openValue: 0,
  wonTotal: 0,
  lostTotal: 0,
}

/**
 * Pipeline counters for the board above the lead list.
 *
 * Separate from useLeads because it answers a different question: the list
 * shows one filtered page, this shows the shape of the whole pipeline. Folding
 * them together would mean recomputing every counter on each keystroke of the
 * search box.
 *
 * @param {{ownerId?: string|number}} [options] Scopes every figure to one rep.
 */
export function useLeadStats({ ownerId = '' } = {}) {
  const [nonce, setNonce] = useState(0)
  const request = useMemo(() => ({ ownerId, nonce }), [ownerId, nonce])

  const [result, setResult] = useState({ request: null, stats: EMPTY, error: null })

  const isLoading = result.request !== request

  useEffect(() => {
    let ignore = false

    getLeadStats({ ownerId: request.ownerId })
      .then((stats) => {
        if (!ignore) setResult({ request, stats, error: null })
      })
      .catch((error) => {
        // A failed counter must not take the list down with it — the board is
        // supporting detail, and the table below is the actual work surface.
        if (!ignore) setResult({ request, stats: EMPTY, error })
      })

    return () => {
      ignore = true
    }
  }, [request])

  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  return { stats: result.stats, isLoading, error: result.error, refresh }
}
