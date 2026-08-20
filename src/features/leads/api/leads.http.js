import { api } from '@/lib/apiClient'
import { deriveInitials, pageResult, unwrap } from '@/lib/apiEnvelope'

/**
 * Real lead endpoints — the `leads`, `lead_activities` and `lead_requirements`
 * tables.
 *
 *   GET    /api/leads                            leads:view
 *   GET    /api/leads/stats                      leads:view
 *   GET    /api/leads/:id                        leads:view
 *   POST   /api/leads                            leads:create
 *   PUT    /api/leads/:id                        leads:manage
 *   PATCH  /api/leads/:id/status                 leads:manage
 *   POST   /api/leads/:id/activities             leads:manage
 *   POST   /api/leads/:id/requirements           leads:manage
 *   PATCH  /api/leads/:id/requirements/:reqId    leads:manage
 *   DELETE /api/leads/:id/requirements/:reqId    leads:manage
 *   POST   /api/leads/:id/convert                leads:convert
 *
 * `:id` accepts "LED-260819-007" or the bare "7", and the API returns the
 * LED- form as the row's `id`, so an id from any response can be handed
 * straight back in a URL with no bookkeeping here.
 *
 * Every mutation except the requirement writes answers with the whole updated
 * lead, so callers replace their cached record rather than refetching. The
 * contract matches leads.mock.js exactly — same arguments, same shapes — so
 * nothing above api/ can tell which implementation is active.
 */

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

/** UI sort keys mapped to the columns the API will actually sort by. */
const SORT_COLUMNS = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  contactName: 'contact_name',
  companyName: 'company_name',
  status: 'status',
  source: 'source',
  estimatedValue: 'estimated_value',
  nextFollowUp: 'next_follow_up_on',
}

const DEFAULT_SORT_KEY = 'createdAt'

const mapPerson = (raw) =>
  raw ? { id: raw.id, name: raw.name, initials: deriveInitials(raw.name) } : null

const mapActivity = (raw) => ({
  id: raw.id,
  type: raw.type,
  notes: raw.notes,
  occurredAt: raw.occurred_at,
  // Null once the user who logged it has been deleted — the activity outlives
  // them by design, so the timeline falls back to a neutral label.
  author: mapPerson(raw.user),
})

const mapRequirement = (raw) => ({
  id: raw.id,
  requirement: raw.requirement,
  priority: raw.priority,
  status: raw.status,
  coveredByProduct: raw.covered_by_product
    ? { id: raw.covered_by_product.id, name: raw.covered_by_product.name }
    : null,
})

/**
 * Normalises a server record into the shape the UI consumes.
 *
 * Detail-only fields (activities, requirements, the long-text columns) are
 * absent from list rows. They are defaulted rather than left undefined so a
 * list row and a detail record are the same shape and no component has to
 * branch on which one it was handed.
 */
function mapLead(raw) {
  return {
    id: raw.id,
    leadId: raw.lead_id,
    contactName: raw.contact_name,
    phone: raw.phone,
    email: raw.email ?? '',
    companyName: raw.company_name ?? '',
    source: raw.source,
    status: raw.status,
    solutionType: raw.solution_type,
    estimatedValue: raw.estimated_value ?? null,
    nextFollowUpOn: raw.next_follow_up_on ?? null,
    lostReason: raw.lost_reason ?? null,
    lostNotes: raw.lost_notes ?? '',
    closedAt: raw.closed_at ?? null,
    owner: mapPerson(raw.owner),
    interestedProduct: raw.interested_product
      ? { id: raw.interested_product.id, name: raw.interested_product.name }
      : null,
    // Present only once won — this is the link into quotations and agreements.
    customer: raw.customer
      ? { id: raw.customer.id, name: raw.customer.company_name }
      : null,
    requirementSummary: raw.requirement_summary ?? '',
    customScope: raw.custom_scope ?? '',
    activities: (raw.activities ?? []).map(mapActivity),
    requirements: (raw.requirements ?? []).map(mapRequirement),
    /**
     * Computed server-side from the requirement rows. `fitsExistingProduct` is
     * null until something has been assessed — "no gaps" over an empty list is
     * an absence of evidence, not a finding.
     */
    requirementStats: raw.requirement_stats
      ? {
          total: raw.requirement_stats.total,
          covered: raw.requirement_stats.covered,
          gaps: raw.requirement_stats.gaps,
          open: raw.requirement_stats.open,
          fitsExistingProduct: raw.requirement_stats.fits_existing_product,
        }
      : { total: 0, covered: 0, gaps: 0, open: 0, fitsExistingProduct: null },
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

/** Shared 404 translation, so callers catch one error type either way. */
function rethrow(error, id) {
  if (error.status === 404) throw new NotFoundError(`Lead ${id} was not found.`)
  throw error
}

export async function listLeads({
  query = '',
  status = '',
  source = '',
  solutionType = '',
  ownerId = '',
  followUp = '',
  openOnly = undefined,
  sortBy = DEFAULT_SORT_KEY,
  sortDir = 'desc',
  page = 1,
  perPage = 10,
  signal,
} = {}) {
  const column = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS[DEFAULT_SORT_KEY]

  const payload = await api.get('/leads', {
    // Empty values are stripped by the client, so "any" filters send nothing —
    // which is what the API reads as unfiltered.
    params: {
      search: query,
      status,
      source,
      solution_type: solutionType,
      owner_id: ownerId,
      follow_up: followUp,
      open: openOnly,
      sort: `${column}:${sortDir}`,
      page,
      perPage,
    },
    signal,
  })

  return pageResult(payload, mapLead, { page, perPage })
}

/**
 * Pipeline counters for the summary board.
 *
 * @param {{ownerId?: number|string}} [options] Scopes every number to one rep.
 */
export async function getLeadStats({ ownerId = '', signal } = {}) {
  const payload = await api.get('/leads/stats', {
    params: { owner_id: ownerId },
    signal,
  })
  const raw = unwrap(payload) ?? {}

  return {
    byStatus: raw.by_status ?? {},
    bySolutionType: raw.by_solution_type ?? {},
    followUps: {
      overdue: raw.follow_ups?.overdue ?? 0,
      dueToday: raw.follow_ups?.due_today ?? 0,
      unscheduled: raw.follow_ups?.unscheduled ?? 0,
    },
    openTotal: raw.open_total ?? 0,
    openValue: raw.open_value ?? 0,
    wonTotal: raw.won_total ?? 0,
    lostTotal: raw.lost_total ?? 0,
  }
}

export async function getLead(id, { signal } = {}) {
  try {
    const payload = await api.get(`/leads/${encodeURIComponent(id)}`, { signal })
    return mapLead(unwrap(payload))
  } catch (error) {
    return rethrow(error, id)
  }
}

/**
 * Capture an incoming enquiry.
 *
 * Only `contactName` and `phone` are required — that is genuinely all we have
 * when a number comes in, and demanding more would push people to invent it.
 * The server always starts a new lead at "New" regardless of what is sent.
 */
export async function createLead(input) {
  const payload = await api.post('/leads', {
    contact_name: input.contactName?.trim(),
    phone: input.phone?.trim(),
    // Omitted rather than sent empty: an absent key is how the API reads
    // "leave it null".
    email: input.email?.trim() || undefined,
    company_name: input.companyName?.trim() || undefined,
    source: input.source || undefined,
    requirement_summary: input.requirementSummary?.trim() || undefined,
    estimated_value: input.estimatedValue === '' ? undefined : Number(input.estimatedValue),
    owner_id: input.ownerId ? Number(input.ownerId) : undefined,
    next_follow_up_on: input.nextFollowUpOn || undefined,
  })

  return mapLead(unwrap(payload))
}

/** Empty means "clear it"; the API reads an explicit null as a clear. */
const blankToNull = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : value
  return trimmed === '' || trimmed === undefined ? null : trimmed
}

const trimmed = (value) => (typeof value === 'string' ? value.trim() : value)

/** A missing enum value means "unchanged" — these columns are NOT NULL. */
const enumOrSkip = (value) => value || undefined

const numberOrNull = (value) =>
  value === '' || value == null ? null : Number(value)

/**
 * How each UI field maps onto the API's column names and null semantics.
 *
 * Driving the payload from a table rather than an object literal is what makes
 * a partial update actually partial — see updateLead below.
 */
const LEAD_FIELDS = {
  contactName: ['contact_name', trimmed],
  phone: ['phone', trimmed],
  email: ['email', blankToNull],
  companyName: ['company_name', blankToNull],
  source: ['source', enumOrSkip],
  solutionType: ['solution_type', enumOrSkip],
  interestedProductId: ['interested_product_id', numberOrNull],
  customScope: ['custom_scope', blankToNull],
  requirementSummary: ['requirement_summary', blankToNull],
  estimatedValue: ['estimated_value', numberOrNull],
  ownerId: ['owner_id', numberOrNull],
  nextFollowUpOn: ['next_follow_up_on', blankToNull],
}

/**
 * Edit a lead's own fields.
 *
 * Status is deliberately not accepted here — it moves through
 * `updateLeadStatus` or `convertLead`, so the closed_at and lost_reason
 * bookkeeping lives in one place on the server.
 *
 * ── Only the keys you pass are sent ──
 * The API treats an absent key as "leave it alone" and an explicit null as
 * "clear it". This used to build a fixed payload naming every column, which
 * meant a caller sending one field also sent `email: null`, `company_name:
 * null` and so on — silently wiping everything it had not mentioned. That was
 * survivable only because the single caller was a form that always submitted
 * all twelve fields. Editing one field at a time would have quietly destroyed
 * data, so the payload is now built from the keys actually supplied.
 *
 * @param {string} id
 * @param {object} input Any subset of the keys in LEAD_FIELDS.
 */
export async function updateLead(id, input) {
  const payload = {}

  for (const [key, value] of Object.entries(input)) {
    const field = LEAD_FIELDS[key]
    // Unknown keys are dropped rather than forwarded: the server would 422 on
    // them, and the caller learns nothing useful from that.
    if (!field) continue

    const [column, coerce] = field
    const coerced = coerce(value)
    // `undefined` is how a coercion says "no change" — for the NOT NULL enums,
    // where clearing is not a thing the column allows.
    if (coerced !== undefined) payload[column] = coerced
  }

  try {
    const response = await api.put(`/leads/${encodeURIComponent(id)}`, payload)
    return mapLead(unwrap(response))
  } catch (error) {
    return rethrow(error, id)
  }
}

/**
 * Move a lead through the pipeline.
 *
 * Won is rejected by the API with a 409 — it is reachable only through
 * `convertLead`, which writes the customer record in the same transaction.
 * Lost requires a reason and returns 422 without one.
 */
export async function updateLeadStatus(id, status, { lostReason, lostNotes } = {}) {
  try {
    const payload = await api.patch(`/leads/${encodeURIComponent(id)}/status`, {
      status,
      lost_reason: lostReason || undefined,
      lost_notes: lostNotes?.trim() || undefined,
    })
    return mapLead(unwrap(payload))
  } catch (error) {
    return rethrow(error, id)
  }
}

/**
 * Log a call, email or meeting.
 *
 * The next follow-up date and a stage change ride along on the same request:
 * logging the call is the moment the rep has all three in their head, and
 * splitting them into three forms is how the follow-up date ends up unset.
 */
export async function logLeadActivity(id, input) {
  try {
    const payload = await api.post(`/leads/${encodeURIComponent(id)}/activities`, {
      type: input.type,
      notes: input.notes?.trim(),
      // null clears the date ("no callback needed"); undefined leaves it.
      next_follow_up_on: input.clearFollowUp ? null : input.nextFollowUpOn || undefined,
      status: input.status || undefined,
    })
    return mapLead(unwrap(payload))
  } catch (error) {
    return rethrow(error, id)
  }
}

export async function addLeadRequirement(id, input) {
  const payload = await api.post(`/leads/${encodeURIComponent(id)}/requirements`, {
    requirement: input.requirement?.trim(),
    priority: input.priority || undefined,
  })
  return mapLead(unwrap(payload))
}

/**
 * Assess a requirement: Covered (and by which product) or Gap.
 *
 * The server clears `covered_by_product_id` on any status other than Covered,
 * so a stale product link can never survive a change of mind.
 */
export async function updateLeadRequirement(id, requirementId, input) {
  const payload = await api.patch(
    `/leads/${encodeURIComponent(id)}/requirements/${requirementId}`,
    {
      requirement: input.requirement?.trim() || undefined,
      priority: input.priority || undefined,
      status: input.status || undefined,
      covered_by_product_id: input.coveredByProductId
        ? Number(input.coveredByProductId)
        : null,
    },
  )
  return mapLead(unwrap(payload))
}

export async function deleteLeadRequirement(id, requirementId) {
  const payload = await api.delete(
    `/leads/${encodeURIComponent(id)}/requirements/${requirementId}`,
  )
  return mapLead(unwrap(payload))
}

/**
 * Close a lead as won, creating or linking the customer record.
 *
 * Pass `customerId` to link somebody already in the directory, or the customer
 * fields to create a new one. The API refuses a second conversion with a 409.
 */
export async function convertLead(id, input) {
  try {
    const payload = await api.post(
      `/leads/${encodeURIComponent(id)}/convert`,
      input.customerId
        ? { customer_id: Number(input.customerId) }
        : {
            company_name: input.companyName?.trim(),
            contact_person: input.contactPerson?.trim(),
            email: input.email?.trim(),
            phone: input.phone?.trim() || undefined,
            address: input.address?.trim() || undefined,
          },
    )
    return mapLead(unwrap(payload))
  } catch (error) {
    return rethrow(error, id)
  }
}

/**
 * Lookup lists for the lead forms. Both hit unpaginated master-data endpoints,
 * which exist precisely to fill pickers.
 */
export async function listOwners() {
  const payload = await api.get('/users')
  const records = unwrap(payload) ?? []
  return records.map((user) => ({ value: String(user.id), label: user.name }))
}

export async function listProducts() {
  // Retired products stay on historical leads but should not be offered for
  // new ones, so the picker asks for live entries only.
  const payload = await api.get('/products', { params: { is_active: true } })
  const records = unwrap(payload) ?? []
  return records.map((product) => ({
    value: String(product.id),
    label: product.name,
  }))
}

export async function listCustomers() {
  const payload = await api.get('/customers')
  const records = unwrap(payload) ?? []
  return records.map((customer) => ({
    value: String(customer.id),
    label: customer.company_name,
  }))
}
