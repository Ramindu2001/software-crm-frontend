import { CircleDot, FileText, TriangleAlert, Users } from 'lucide-react'
import { PageHeader, EmptyState, FullPageLoader } from '@/components/common'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { useDashboardStats } from '../hooks/useDashboardStats'

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const ISSUE_TONES = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
}

const QUOTATION_TONES = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
}

export function DashboardPage() {
  const { stats, recentIssues, recentQuotations, isLoading, error, refresh } = useDashboardStats()

  if (isLoading) {
    return <FullPageLoader />
  }

  if (error) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn't load dashboard"
        description={error.message ?? 'Something went wrong fetching overview data.'}
        action={
          <Button size="sm" onClick={refresh}>
            Try again
          </Button>
        }
      />
    )
  }

  const statCards = [
    { label: 'Active customers', value: stats?.activeCustomers, icon: Users },
    { label: 'Open issues', value: stats?.openIssues, icon: CircleDot },
    { label: 'Critical issues', value: stats?.criticalIssues, icon: TriangleAlert },
    { label: 'Pending quotations', value: CURRENCY_FORMATTER.format(stats?.pendingQuotationsValue || 0), icon: FileText },
  ]

  return (
    <>
      <PageHeader
        description="Overview of current CRM activity."
        actions={<Button size="sm">New issue</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-muted">{label}</p>
                <Icon className="size-4 text-ink-subtle" aria-hidden="true" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent issues</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {recentIssues?.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-muted">No recent issues.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recentIssues?.map(({ id, title, priority, status }) => (
                  <li
                    key={id}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sunken"
                  >
                    <span className="font-mono text-xs text-ink-subtle">{id}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {title}
                    </span>
                    <Badge tone={ISSUE_TONES[priority] || 'neutral'} size="sm" dot>
                      {status.replace('_', ' ')}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent quotations</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {recentQuotations?.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-muted">No recent quotations.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recentQuotations?.map(({ id, customerName, totalAmount, status }) => (
                  <li
                    key={id}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sunken"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {customerName}
                    </span>
                    <span className="text-sm font-medium tabular-nums text-ink">
                      {CURRENCY_FORMATTER.format(totalAmount)}
                    </span>
                    <Badge tone={QUOTATION_TONES[status] || 'neutral'} size="sm">
                      {status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
