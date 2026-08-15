import { api } from '@/lib/apiClient'
import { deriveInitials, pageResult, unwrap } from '@/lib/apiEnvelope'

/**
 * Real issues endpoints — the `tickets` table.
 *
 *   GET   /api/issues              any logged-in   paginated + filtered
 *   GET   /api/issues/:id          any logged-in   detail + comment thread
 *   POST  /api/issues              Admin, Support  raise an issue
 *   PATCH /api/issues/:id/status   any logged-in   move through the workflow
 *
 * `:id` accepts "SYN-1042" or the bare "1042", and the API already returns the
 * SYN- form as the row's `id`, so an id from any response can be handed
 * straight back in a URL with no bookkeeping here.
 *
 * The contract these functions expose matches issues.mock.js exactly — same
 * arguments, same returned shapes — so nothing above api/ can tell which
 * implementation is active.
 */

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

/**
 * UI sort keys mapped to the columns the API will actually sort by. Anything
 * outside this allowlist comes back 400 naming the accepted values, so the
 * mapping is not optional politeness.
 *
 * `createdAt` is the only timestamp: tickets have no `updated_at` column, so
 * there is deliberately no "recently updated" ordering to offer.
 */
const SORT_COLUMNS = {
  id: 'id',
  title: 'title',
  status: 'status',
  priority: 'priority',
  category: 'category',
  createdAt: 'created_at',
}

const DEFAULT_SORT_KEY = 'createdAt'

function mapDeveloper(raw) {
  if (!raw) return null
  return {
    id: raw.id,
    name: raw.name,
    initials: deriveInitials(raw.name),
  }
}

function mapComment(raw) {
  return {
    id: raw.id,
    body: raw.comment,
    createdAt: raw.created_at,
    author: {
      id: raw.user?.id,
      name: raw.user?.name ?? 'Unknown',
      role: raw.user?.role ?? null,
      initials: deriveInitials(raw.user?.name),
    },
  }
}

/**
 * Normalises a server record into the shape the UI consumes.
 *
 * `customer` and `product` arrive as nested objects; both are flattened to a
 * display name plus the id, because every screen shows the name and only the
 * create form needs the id.
 *
 * Detail-only fields (description, completedAt, comments) are absent from list
 * rows. They are defaulted rather than left undefined so a list row and a
 * detail record are the same shape and a component never has to branch.
 */
function mapIssue(raw) {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? '',
    status: raw.status,
    priority: raw.priority,
    category: raw.category,
    customer: {
      id: raw.customer?.id ?? null,
      name: raw.customer?.company_name ?? 'Unknown',
    },
    product: {
      id: raw.product?.id ?? null,
      name: raw.product?.name ?? 'Unknown',
    },
    assignee: mapDeveloper(raw.assigned_developer),
    createdAt: raw.created_at,
    completedAt: raw.completed_at ?? null,
    comments: (raw.comments ?? []).map(mapComment),
  }
}

/**
 * @param {object} [params] Same shape the mock accepts.
 * @returns {Promise<{data: Array, total: number, filteredTotal: number,
 *   currentPage: number, lastPage: number, perPage: number}>}
 */
export async function listIssues({
  query = '',
  status = '',
  priority = '',
  category = '',
  sortBy = DEFAULT_SORT_KEY,
  sortDir = 'desc',
  page = 1,
  perPage = 10,
  signal,
} = {}) {
  const column = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS[DEFAULT_SORT_KEY]

  const payload = await api.get('/issues', {
    // Empty values are stripped by the client, so "any" filters send nothing
    // — which is what the API reads as unfiltered.
    params: {
      search: query,
      status,
      priority,
      category,
      sort: `${column}:${sortDir}`,
      page,
      // camelCase: the API reads `perPage`, falling back to `limit`.
      perPage,
    },
    signal,
  })

  return pageResult(payload, mapIssue, { page, perPage })
}

/**
 * @param {string} id "SYN-1042" or "1042".
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 */
export async function getIssue(id) {
  try {
    const payload = await api.get(`/issues/${encodeURIComponent(id)}`)
    return mapIssue(unwrap(payload))
  } catch (error) {
    // Translated so callers can catch one error type regardless of which
    // implementation is active.
    if (error.status === 404) {
      throw new NotFoundError(`Issue ${id} was not found.`)
    }
    throw error
  }
}

/**
 * Raise an issue. Requires the Admin or Support role — a Developer's token
 * comes back 403.
 *
 * The response is the fully created issue with customer, product and developer
 * names resolved, so the caller never needs a follow-up read.
 *
 * @param {{title: string, description?: string, category: string,
 *   priority: string, customerId: number|string, productId: number|string,
 *   assigneeId?: number|string}} input
 * @returns {Promise<object>}
 */
export async function createIssue(input) {
  const payload = await api.post('/issues', {
    title: input.title?.trim(),
    description: input.description?.trim() || undefined,
    category: input.category,
    priority: input.priority,
    customer_id: Number(input.customerId),
    product_id: Number(input.productId),
    // Omitted entirely rather than sent as null: the column is nullable and
    // an absent key is how the API reads "leave it unassigned".
    assigned_developer_id: input.assigneeId ? Number(input.assigneeId) : undefined,
  })

  return mapIssue(unwrap(payload))
}

/**
 * Move an issue through the workflow. Any authenticated user may do this,
 * Developers included, and transitions are unrestricted — the API enforces no
 * state machine.
 *
 * The server answers with `{ status }` alone, not the whole issue, so this
 * returns just the new status and the caller merges it into what it already
 * has. Refetching to recover a full record would be a wasted round trip.
 *
 * Reaching "Resolved" for the first time is also what stamps `completed_at`
 * server-side, and moving away from it clears the stamp again.
 *
 * @param {string} id
 * @param {string} status One of ISSUE_STATUS.
 * @returns {Promise<{status: string}>}
 * @throws {NotFoundError}
 */
export async function updateIssueStatus(id, status) {
  try {
    const payload = await api.patch(
      `/issues/${encodeURIComponent(id)}/status`,
      { status },
    )
    return { status: unwrap(payload)?.status ?? status }
  } catch (error) {
    if (error.status === 404) {
      throw new NotFoundError(`Issue ${id} was not found.`)
    }
    throw error
  }
}

/**
 * Lookup lists for the create form.
 *
 * All three hit unpaginated master-data endpoints, which exist precisely to
 * fill pickers, so there is nothing to page through.
 *
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
export async function listAssignees() {
  // Filtered by role NAME, so the frontend never has to know that Developer
  // happens to be role_id 3.
  const payload = await api.get('/users', { params: { role: 'Developer' } })
  const records = unwrap(payload) ?? []
  return records.map((user) => ({ value: String(user.id), label: user.name }))
}

export async function listCustomers() {
  const payload = await api.get('/customers')
  const records = unwrap(payload) ?? []
  return records.map((customer) => ({
    value: String(customer.id),
    label: customer.company_name,
  }))
}

export async function listProducts() {
  // Retired products stay on historical issues but should not be offered for
  // new ones, so the picker asks for live entries only.
  const payload = await api.get('/products', { params: { is_active: true } })
  const records = unwrap(payload) ?? []
  return records.map((product) => ({
    value: String(product.id),
    label: product.name,
  }))
}
