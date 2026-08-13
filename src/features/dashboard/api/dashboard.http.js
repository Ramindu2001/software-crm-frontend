import { api } from '@/lib/apiClient'

export async function getDashboardStats({ signal } = {}) {
  const payload = await api.get('/dashboard/stats', { signal })
  
  return {
    stats: {
      activeCustomers: payload.data?.stats?.active_customers ?? 0,
      openIssues: payload.data?.stats?.open_issues ?? 0,
      criticalIssues: payload.data?.stats?.critical_issues ?? 0,
      pendingQuotationsValue: payload.data?.stats?.pending_quotations_value ?? 0,
    },
    recentIssues: (payload.data?.recent_issues ?? []).map(issue => ({
      id: issue.id,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
    })),
    recentQuotations: (payload.data?.recent_quotations ?? []).map(quote => ({
      id: quote.id,
      customerName: quote.customer_name,
      totalAmount: quote.total_amount,
      status: quote.status,
    })),
  }
}
