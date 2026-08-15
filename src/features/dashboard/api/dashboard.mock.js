import { MOCK_ISSUES } from '../../issues/api/mockIssues'
import { MOCK_QUOTATIONS } from '../../quotations/api/mockQuotations'

/**
 * Mock dashboard API.
 *
 * Returns the same four counters and recent-issue shape as dashboard.http.js,
 * and applies the same definitions the backend does — see the comment there.
 *
 * `activeCustomers` is the one that cannot be reproduced faithfully: the real
 * counter reads subscriptions, which the mock data does not model. Approved
 * quotations stand in as the closest available proxy for a paying customer.
 */

const LATENCY_MS = 400

const delay = (ms = LATENCY_MS) =>
  new Promise((resolve) => setTimeout(resolve, ms))

const RECENT_ISSUES_LIMIT = 5

export async function getDashboardStats() {
  await delay()

  const activeCustomers = new Set(
    MOCK_QUOTATIONS.filter((quotation) => quotation.status === 'Approved').map(
      (quotation) => quotation.customerId,
    ),
  ).size

  // The literal status, matching OPEN_ISSUE_STATUSES on the backend.
  const openIssues = MOCK_ISSUES.filter((issue) => issue.status === 'Open').length

  // High, because the priority enum has no 'Critical'.
  const criticalIssues = MOCK_ISSUES.filter(
    (issue) => issue.priority === 'High',
  ).length

  // No invoices in the mock data, so revenue is the current month's approved
  // quotation value — the nearest stand-in for money collected.
  const now = new Date()
  const monthlyRevenue = MOCK_QUOTATIONS.filter((quotation) => {
    const raised = new Date(quotation.createdAt)
    return (
      quotation.status === 'Approved' &&
      raised.getUTCFullYear() === now.getUTCFullYear() &&
      raised.getUTCMonth() === now.getUTCMonth()
    )
  }).reduce((sum, quotation) => sum + quotation.finalAmount, 0)

  const recentIssues = [...MOCK_ISSUES]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, RECENT_ISSUES_LIMIT)
    .map((issue) => ({
      id: issue.id,
      title: issue.title,
      status: issue.status,
    }))

  return {
    stats: {
      activeCustomers,
      openIssues,
      criticalIssues,
      monthlyRevenue,
    },
    recentIssues,
  }
}
