import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useLocalStorage } from '@/hooks/useLocalStorage'

/**
 * Every piece of "what am I looking at" state for the pipeline, held in the URL.
 *
 * ── Why the URL and not useState ──
 * This state used to live in component state, which meant the single most
 * common thing a rep does — work the follow-up queue, open a lead, come back —
 * lost the queue. Back-navigation returned an unfiltered page 1, so the rep
 * re-applied the same three filters after every single lead. Filters in the URL
 * fix that for free, and get shareable links ("here are the overdue ones") and
 * bookmarks along with it.
 *
 * The search box is the one exception to "URL is the source of truth": it keeps
 * a local draft so typing stays instant, and only the settled value is written
 * back. Writing every keystroke would spam history and re-render the tree from
 * the router on each character.
 *
 * ── History behaviour ──
 * Search replaces (debounced typing must not fill the back stack); discrete
 * changes — a filter chip, a sort, a page — push, because stepping back through
 * them is exactly what a user expects Back to do.
 */

/** Short param names, because these end up in links people paste to each other. */
const PARAM = {
  query: 'q',
  status: 'status',
  source: 'source',
  solutionType: 'solution',
  ownerId: 'owner',
  followUp: 'followup',
}

const FILTER_KEYS = Object.keys(PARAM)

/** Keys that count as "narrowing the list" for the clear-all affordance. */
const EMPTY_FILTERS = Object.fromEntries(FILTER_KEYS.map((key) => [key, '']))

const VIEW_STORAGE_KEY = 'leads:view'
const VIEWS = ['list', 'board']

/**
 * Newest first normally — a lead that came in this morning is the urgent one.
 *
 * But once a follow-up bucket is selected the question has changed from "what
 * is new?" to "who is waiting longest?", so the default flips to the follow-up
 * date ascending. An explicit `sort` in the URL always wins over both.
 */
function defaultSortFor(followUp) {
  return followUp
    ? { by: 'nextFollowUp', dir: 'asc' }
    : { by: 'createdAt', dir: 'desc' }
}

export function useLeadFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  /**
   * Write a set of params at once.
   *
   * Any change other than paging clears `page`: staying on page 7 of a result
   * set that just shrank to two pages shows an empty table, which reads as
   * "no results" rather than "wrong page".
   */
  const setParams = useCallback(
    (updates, { replace = false } = {}) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)

          for (const [key, value] of Object.entries(updates)) {
            if (value === undefined || value === null || value === '') {
              next.delete(key)
            } else {
              next.set(key, String(value))
            }
          }

          if (!('page' in updates)) next.delete('page')
          return next
        },
        { replace },
      )
    },
    [setSearchParams],
  )

  // ── Filters ────────────────────────────────────────────

  const filters = useMemo(() => {
    const read = {}
    for (const key of FILTER_KEYS) read[key] = searchParams.get(PARAM[key]) ?? ''
    return read
  }, [searchParams])

  const urlQuery = filters.query

  // The input's own value. Seeded from the URL and thereafter driven locally,
  // so a keystroke never waits on a router round trip.
  const [queryDraft, setQueryDraft] = useState(urlQuery)
  const debouncedQuery = useDebouncedValue(queryDraft, 300)

  // Settled typing → URL. Replaces rather than pushes, so a ten-character
  // search leaves one history entry instead of ten.
  useEffect(() => {
    if (debouncedQuery === urlQuery) return
    setParams({ [PARAM.query]: debouncedQuery }, { replace: true })
    // `urlQuery` is deliberately not a dependency: this effect reacts to the
    // user typing, and including it would make an external change (Back, or
    // Clear) immediately re-push the stale draft it is trying to replace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, setParams])

  /**
   * URL → input, for the changes the input did not cause: Back/Forward, the
   * clear-all button, or a link someone pasted in.
   *
   * Adjusted during render rather than in an effect — the pattern React
   * documents for "reset state when something external changes", and the one
   * useQuotationBuilder already uses. An effect would render once with the
   * stale term before correcting it, and cascade a second render to do so.
   *
   * `syncedQuery` records the URL value already reflected here, so the
   * adjustment runs once per external change. The guard against
   * `debouncedQuery` is what stops the input fighting itself: when the URL
   * changed *because* the debounce just wrote to it, there is nothing to pull
   * back.
   */
  const [syncedQuery, setSyncedQuery] = useState(urlQuery)

  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery)
    if (urlQuery !== debouncedQuery) setQueryDraft(urlQuery)
  }

  const setFilter = useCallback(
    (key, value) => {
      if (key === 'query') {
        setQueryDraft(value)
        return
      }
      setParams({ [PARAM[key]]: value })
    },
    [setParams],
  )

  const resetFilters = useCallback(() => {
    setQueryDraft('')
    setParams(Object.fromEntries(Object.values(PARAM).map((name) => [name, ''])))
  }, [setParams])

  const hasActiveFilters = FILTER_KEYS.some(
    (key) => filters[key] !== EMPTY_FILTERS[key],
  )

  // ── Sort ───────────────────────────────────────────────

  const sort = useMemo(() => {
    const raw = searchParams.get('sort')
    if (!raw) return defaultSortFor(filters.followUp)

    const [by, dir] = raw.split(':')
    return { by, dir: dir === 'asc' ? 'asc' : 'desc' }
  }, [searchParams, filters.followUp])

  /** First click on a column sorts ascending; clicking the active one flips it. */
  const toggleSort = useCallback(
    (field) => {
      const dir = sort.by === field && sort.dir === 'asc' ? 'desc' : 'asc'
      setParams({ sort: `${field}:${dir}` })
    },
    [sort, setParams],
  )

  // ── Paging ─────────────────────────────────────────────

  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const setPage = useCallback(
    (value) => setParams({ page: value > 1 ? value : '' }),
    [setParams],
  )

  // ── View ───────────────────────────────────────────────

  /**
   * Remembered across visits, because which view somebody works in is a
   * standing preference rather than a per-visit decision. A `view` in the URL
   * still wins, so a shared link opens on the view its sender was looking at.
   */
  const [storedView, setStoredView] = useLocalStorage(VIEW_STORAGE_KEY, 'list')
  const urlView = searchParams.get('view')
  const view = VIEWS.includes(urlView)
    ? urlView
    : VIEWS.includes(storedView)
      ? storedView
      : 'list'

  const setView = useCallback(
    (value) => {
      setStoredView(value)
      // Paging is a list concept; carrying page 4 onto the board would filter
      // the board down to nothing.
      setParams({ view: value, page: '' })
    },
    [setParams, setStoredView],
  )

  return {
    // The draft, not the URL value — this is what the search input binds to.
    filters: { ...filters, query: queryDraft },
    setFilter,
    resetFilters,
    hasActiveFilters,
    sort,
    toggleSort,
    page,
    setPage,
    view,
    setView,
    /** The settled filter set to fetch with. Stable while the user is typing. */
    request: useMemo(
      () => ({ ...filters, query: urlQuery }),
      [filters, urlQuery],
    ),
  }
}
