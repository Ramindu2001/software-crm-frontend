import { MOCK_ISSUES } from '../../issues/api/mockIssues'
import { MOCK_CUSTOMERS } from '../../customers/api/mockCustomers'
import { MOCK_QUOTATIONS } from '../../quotations/api/mockQuotations'

/**
 * Mock dashboard API.
 */

const LATENCY_MS = 400

const delay = (ms = LATENCY_MS) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export async function getDashboardStats() {
  await delay()

  const activeCustomers = MOCK_CUSTOMERS.filter((c) => c.status === 'active').length
  const openIssues = MOCK_ISSUES.filter((i) => i.status === 'open').length
  const criticalIssues = MOCK_ISSUES.filter((i) => i.priority === 'critical' && i.status !== 'closed' && i.status !== 'resolved').length
  
  const pendingQuotations = MOCK_QUOTATIONS.filter((q) => q.status === 'pending')
  const pendingQuotationsValue = pendingQuotations.reduce((sum, q) => sum + q.totalAmount, 0)

  // Sort by created/updated descending to get "recent"
  const recentIssues = [...MOCK_ISSUES]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map(issue => ({
      id: issue.id,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
    }))

  const recentQuotations = [...MOCK_QUOTATIONS]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map(quote => {
      const customer = MOCK_CUSTOMERS.find(c => c.id === quote.customerId)
      return {
        id: quote.id,
        customerName: customer ? customer.name : 'Unknown',
        totalAmount: quote.totalAmount,
        status: quote.status,
      }
    })

  return {
    stats: {
      activeCustomers,
      openIssues,
      criticalIssues,
      pendingQuotationsValue,
    },
    recentIssues,
    recentQuotations,
  }
}
