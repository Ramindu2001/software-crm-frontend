import { useCallback, useEffect, useMemo, useState } from 'react'
import { listLeads, updateLeadStatus } from '../api'
import { OPEN_STAGES } from '../constants'

/**
 * The pipeline as columns — every open lead, grouped by stage.
 *
 * ── Why this is not useLeads with a bigger page size ──
 * A board is not a page of a list. It needs every open lead at once (a column
 * showing 4 of 11 cards is worse than no board), it orders cards within a
 * column rather than globally, and it owns a mutation the list does not: moving
 * a card has to update the screen before the request resolves, or dragging
 * feels broken.
 *
 * ── The 100 ceiling ──
 * The API clamps perPage at 100, so that is the board's ceiling too. Rather
 * than paginate a board — which would defeat the point — the hook reports
 * `isTruncated` and the view tells the user plainly that it is showing the
 * first 100 and that filtering will narrow it. A silent partial board would
 * have people concluding leads had vanished.
 */

const BOARD_LIMIT = 100

/**
 * Most urgent at the top of each column. A board sorted by capture date buries
 * the lead that has been waiting three weeks under this morning's enquiries.
 */
const BOARD_SORT = { sortBy: 'nextFollowUp', sortDir: 'asc' }

export function useLeadBoard({ request, enabled = true }) {
  const [nonce, setNonce] = useState(0)

  const fetchKey = useMemo(
    () => ({
      query: request.query,
      source: request.source,
      solutionType: request.solutionType,
      ownerId: request.ownerId,
      followUp: request.followUp,
      // Stage is the board's own axis — a board filtered to one stage is a
      // single column, so the status filter is deliberately not applied here.
      openOnly: true,
      perPage: BOARD_LIMIT,
      page: 1,
      ...BOARD_SORT,
      nonce,
      enabled,
    }),
    [
      request.query,
      request.source,
      request.solutionType,
      request.ownerId,
      request.followUp,
      nonce,
      enabled,
    ],
  )

  const [result, setResult] = useState({
    key: null,
    leads: [],
    total: 0,
    error: null,
  })

  const isLoading = enabled && result.key !== fetchKey

  useEffect(() => {
    if (!enabled) return
    let ignore = false

    listLeads(fetchKey)
      .then((response) => {
        if (ignore) return
        setResult({
          key: fetchKey,
          leads: response.data,
          total: response.filteredTotal,
          error: null,
        })
      })
      .catch((error) => {
        if (ignore) return
        setResult({ key: fetchKey, leads: [], total: 0, error })
      })

    return () => {
      ignore = true
    }
  }, [fetchKey, enabled])

  /** One array per open stage, in pipeline order. */
  const columns = useMemo(() => {
    const grouped = Object.fromEntries(OPEN_STAGES.map((stage) => [stage.value, []]))

    for (const lead of result.leads) {
      // A lead whose stage is not an open one has been closed underneath us
      // (another tab, another user). Dropping it is right: this board shows
      // live work, and the next refresh will agree.
      if (grouped[lead.status]) grouped[lead.status].push(lead)
    }

    return grouped
  }, [result.leads])

  const replaceLead = useCallback((updated) => {
    setResult((current) => ({
      ...current,
      leads: current.leads.map((lead) =>
        lead.leadId === updated.leadId ? updated : lead,
      ),
    }))
  }, [])

  /**
   * Take a lead off the board.
   *
   * Called after a conversion or a loss: both close the lead, and a closed lead
   * is no longer live work. Keeping it would leave a Won card sitting in the
   * Qualified column until the next refresh.
   */
  const removeLead = useCallback((leadId) => {
    setResult((current) => ({
      ...current,
      leads: current.leads.filter((lead) => lead.leadId !== leadId),
      total: Math.max(0, current.total - 1),
    }))
  }, [])

  /**
   * Move a card to another stage, optimistically.
   *
   * The card lands in its new column on drop rather than after the round trip,
   * because a card that hangs in mid-air for 200ms reads as a failed drag and
   * gets dragged again. On failure the card goes back exactly where it was and
   * the caller is handed the error to surface — a silent rollback would look
   * like the drop simply did not register.
   *
   * Won and Lost never reach this function: both need more than a status change
   * and the board routes those drops to their own dialogs.
   */
  const moveLead = useCallback(
    async (lead, toStatus) => {
      if (lead.status === toStatus) return lead

      setResult((current) => ({
        ...current,
        leads: current.leads.map((row) =>
          row.leadId === lead.leadId ? { ...row, status: toStatus } : row,
        ),
      }))

      try {
        const updated = await updateLeadStatus(lead.id, toStatus)
        replaceLead(updated)
        return updated
      } catch (error) {
        setResult((current) => ({
          ...current,
          leads: current.leads.map((row) =>
            row.leadId === lead.leadId ? lead : row,
          ),
        }))
        throw error
      }
    },
    [replaceLead],
  )

  const refresh = useCallback(() => setNonce((current) => current + 1), [])

  return {
    columns,
    total: result.total,
    isTruncated: result.total > BOARD_LIMIT,
    boardLimit: BOARD_LIMIT,
    isLoading,
    error: result.error,
    moveLead,
    replaceLead,
    removeLead,
    refresh,
  }
}
