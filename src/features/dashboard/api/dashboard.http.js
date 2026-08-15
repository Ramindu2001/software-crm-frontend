import { api } from '@/lib/apiClient'
import { unwrap } from '@/lib/apiEnvelope'

/**
 * GET /api/dashboard/stats — any logged-in user.
 *
 * Four counters and the five most recent issues, in two SQL statements, so the
 * whole tile row reports a single consistent point in time.
 *
 * What the numbers actually mean is worth knowing, because several are
 * judgement calls the schema could not settle (all four are defined in one
 * block at the top of the backend's dashboard.controller.js):
 *
 *   activeCustomers  customers holding at least one Active subscription —
 *                    NOT a count of all customers. The customers table has no
 *                    status column, so subscriptions.status is the only notion
 *                    of "active" anywhere in the schema.
 *   openIssues       the literal status 'Open', not "everything unresolved".
 *   criticalIssues   counts priority='High', because the priority enum has no
 *                    'Critical' value.
 *   monthlyRevenue   Paid invoices raised this calendar month, dated by
 *                    created_at — there is no paid_at column, so an invoice
 *                    raised in January and paid in March counts toward January.
 *
 * `recent_issues` carries id, title and status only — no priority.
 */
export async function getDashboardStats({ signal } = {}) {
  const payload = await api.get('/dashboard/stats', { signal })
  const data = unwrap(payload) ?? {}

  return {
    stats: {
      activeCustomers: data.active_customers ?? 0,
      openIssues: data.open_issues ?? 0,
      criticalIssues: data.critical_issues ?? 0,
      monthlyRevenue: data.monthly_revenue ?? 0,
    },
    recentIssues: (data.recent_issues ?? []).map((issue) => ({
      // Already the SYN- reference, matching the Issues API, so these link
      // straight through to the detail route.
      id: issue.id,
      title: issue.title,
      status: issue.status,
    })),
  }
}
