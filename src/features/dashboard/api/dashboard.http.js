import { api } from '@/lib/apiClient'

export async function getDashboardStats({ signal } = {}) {
  const payload = await api.get('/dashboard/stats', { signal })
  
  const data = payload.data ?? payload

  return {
    stats: {
      activeCustomers: data.active_customers ?? 0,
      openIssues: data.open_issues ?? 0,
      criticalIssues: data.critical_issues ?? 0,
      monthlyRevenue: data.monthly_revenue ?? 0,
    },
    recentIssues: (data.recent_issues ?? []).map((issue) => ({
      id: issue.id,
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
    })),
  }
}
