/**
 * Helpers for the API's success envelope.
 *
 * Every endpoint answers with `{ success, message, data, meta? }`. These
 * helpers exist so each feature's `*.http.js` unwraps it the same way — the
 * previous per-feature copies had each drifted, and all of them were reading
 * Laravel's `meta.current_page` from a server that sends `meta.currentPage`.
 *
 * The list shape below is the contract every list hook consumes, and both the
 * mock and HTTP implementations must return it:
 *
 *   { data, total, filteredTotal, currentPage, lastPage, perPage }
 */

/** Peel `data` off an envelope, tolerating a bare payload. */
export function unwrap(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data
  }
  return payload
}

/**
 * Build a list result from a server-paginated endpoint.
 *
 * `meta` is camelCase — `{ total, currentPage, lastPage, perPage }` — and is
 * trusted over the requested values, since the server clamps perPage to 100
 * and page to the available range.
 *
 * total and filteredTotal are deliberately the same number. The API reports
 * only the count matching the current filters, and inventing an unfiltered
 * total would cost a second request on every keystroke.
 *
 * @param {object} payload Raw envelope.
 * @param {(row: object) => object} mapRow
 * @param {{page?: number, perPage?: number}} [requested] Fallbacks.
 */
export function pageResult(payload, mapRow, { page = 1, perPage = 10 } = {}) {
  const rows = unwrap(payload) ?? []
  const data = Array.isArray(rows) ? rows.map(mapRow) : []
  const meta = payload?.meta ?? {}

  const total = meta.total ?? data.length

  return {
    data,
    total,
    filteredTotal: total,
    currentPage: meta.currentPage ?? page,
    lastPage: meta.lastPage ?? 1,
    perPage: meta.perPage ?? perPage,
  }
}

/**
 * Build the same list result from an endpoint that returns everything at once.
 *
 * `/api/customers`, `/api/products` and `/api/users` are unpaginated by design
 * — they exist to fill dropdowns, and a picker needs every option rather than
 * page 1. The tables built on them still want pages, so the slicing happens
 * here instead. Keeping it in api/ rather than in the hook means the hook
 * cannot tell a server-paginated feature from a client-paginated one.
 *
 * @param {Array} rows Already filtered and sorted.
 * @param {{page?: number, perPage?: number, total?: number}} [options]
 *   `total` is the unfiltered count, when the caller knows it.
 */
export function paginate(rows, { page = 1, perPage = 10, total } = {}) {
  const filteredTotal = rows.length
  const lastPage = Math.max(1, Math.ceil(filteredTotal / perPage))
  // Clamp so an out-of-range page (a filter that shrank the result set)
  // degrades to the last real page instead of rendering empty.
  const currentPage = Math.max(1, Math.min(page, lastPage))
  const start = (currentPage - 1) * perPage

  return {
    data: rows.slice(start, start + perPage),
    total: total ?? filteredTotal,
    filteredTotal,
    currentPage,
    lastPage,
    perPage,
  }
}

/**
 * Case-insensitive substring match across the given fields.
 * Used by the client-side filtering the unpaginated endpoints leave to us.
 */
export function matchesQuery(record, query, fields) {
  if (!query) return true
  const needle = query.trim().toLowerCase()
  if (!needle) return true

  return fields.some((field) =>
    String(record[field] ?? '').toLowerCase().includes(needle),
  )
}

/**
 * Sort a copy of `rows` by the value `accessor` returns.
 * Undefined and null sort last regardless of direction, so rows missing the
 * field never displace real values at the top of the table.
 */
export function sortRows(rows, accessor, direction = 'asc') {
  const sign = direction === 'desc' ? -1 : 1

  return [...rows].sort((a, b) => {
    const left = accessor(a)
    const right = accessor(b)

    const leftMissing = left === undefined || left === null
    const rightMissing = right === undefined || right === null
    if (leftMissing || rightMissing) {
      return leftMissing && rightMissing ? 0 : leftMissing ? 1 : -1
    }

    if (left < right) return -sign
    if (left > right) return sign
    return 0
  })
}

/** "Nadia Perera" -> "NP". Shared by every module that renders an avatar. */
export function deriveInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts.at(-1)[0]).toUpperCase()
}
