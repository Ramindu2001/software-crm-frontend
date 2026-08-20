import { useCallback, useEffect, useMemo, useState } from 'react'
import { listLeads } from '../api'

/**
 * One page of the pipeline, for the list view.
 *
 * Filtering, sorting and paging are all sent to the API rather than applied to
 * the response — the endpoint is server-paginated, so filtering locally would
 * only ever filter the page you happen to be holding.
 *
 * The state this reads now lives in the URL (see useLeadFilters); this hook
 * just turns it into a request and holds the answer.
 *
 * @param {object} options
 * @param {object} options.request Settled filter values.
 * @param {{by: string, dir: 'asc'|'desc'}} options.sort
 * @param {number} options.page
 * @param {boolean} [options.enabled] False while the board view is showing, so
 *   the inactive view costs nothing.
 */

/**
 * Enough rows that a normal pipeline is one page. The old value was 10, which
 * turned "look at my leads" into a paging exercise.
 */
const PER_PAGE = 25

const EMPTY = {
  data: [],
  total: 0,
  filteredTotal: 0,
  currentPage: 1,
  lastPage: 1,
  perPage: PER_PAGE,
}

export function useLeads({ request, sort, page, enabled = true }) {
  const [nonce, setNonce] = useState(0)

  const fetchKey = useMemo(
    () => ({
      query: request.query,
      status: request.status,
      source: request.source,
      solutionType: request.solutionType,
      ownerId: request.ownerId,
      followUp: request.followUp,
      sortBy: sort.by,
      sortDir: sort.dir,
      page,
      perPage: PER_PAGE,
      nonce,
      enabled,
    }),
    [
      request.query,
      request.status,
      request.source,
      request.solutionType,
      request.ownerId,
      request.followUp,
      sort.by,
      sort.dir,
      page,
      nonce,
      enabled,
    ],
  )

  const [result, setResult] = useState({ key: null, ...EMPTY, error: null })

  /**
   * Derived rather than stored: no setState-in-effect cascade, and the previous
   * rows stay on screen while a new request is in flight instead of the table
   * flashing empty on every keystroke.
   */
  const isLoading = enabled && result.key !== fetchKey

  useEffect(() => {
    if (!enabled) return

    // Guards against out-of-order responses clobbering newer results when
    // filters change faster than requests resolve.
    let ignore = false

    listLeads(fetchKey)
      .then((response) => {
        if (ignore) return
        setResult({ key: fetchKey, ...response, error: null })
      })
      .catch((error) => {
        if (ignore) return
        setResult({ key: fetchKey, ...EMPTY, error })
      })

    return () => {
      ignore = true
    }
  }, [fetchKey, enabled])

  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  /**
   * Swap one row for the version a mutation just returned.
   *
   * The row-level actions in the list (log a call, move a stage) answer with
   * the whole updated lead, exactly like the detail page's do. Splicing it in
   * beats refetching the page: the rest of the table does not move, and the
   * row the user just acted on updates under their cursor.
   */
  const applyLead = useCallback((updated) => {
    setResult((current) => ({
      ...current,
      data: current.data.map((lead) =>
        lead.leadId === updated.leadId ? updated : lead,
      ),
    }))
  }, [])

  return {
    leads: result.data,
    error: result.error,
    isLoading,
    total: result.total,
    filteredTotal: result.filteredTotal,
    page: result.currentPage,
    lastPage: result.lastPage,
    perPage: result.perPage,
    refresh,
    applyLead,
  }
}
