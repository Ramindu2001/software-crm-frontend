import { Link } from 'react-router-dom'
import { CircleDot, TriangleAlert, Users, Wallet } from 'lucide-react'
import { PageHeader, EmptyState, FullPageLoader } from '@/components/common'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { IssueStatusBadge } from '@/features/issues'
import { useDashboardStats } from '../hooks/useDashboardStats'

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 0,
})

export function DashboardPage() {
  const { stats, recentIssues, isLoading, error, refresh } = useDashboardStats()

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

  /**
   * `hint` spells out what each counter actually measures. Three of the four
   * are narrower than their label suggests — active customers means "holds an
   * active subscription", and critical issues counts High priority, because
   * the enum has no Critical — and a tile that quietly means something else is
   * worse than one that says so.
   */
  const statCards = [
    {
      label: 'Active customers',
      value: stats?.activeCustomers ?? 0,
      hint: 'With an active subscription',
      icon: Users,
    },
    {
      label: 'Open issues',
      value: stats?.openIssues ?? 0,
      hint: 'Status is Open',
      icon: CircleDot,
    },
    {
      label: 'High priority',
      value: stats?.criticalIssues ?? 0,
      hint: 'Across all statuses',
      icon: TriangleAlert,
    },
    {
      label: 'Monthly revenue',
      value: CURRENCY_FORMATTER.format(stats?.monthlyRevenue ?? 0),
      hint: 'Paid invoices raised this month',
      icon: Wallet,
    },
  ]

  return (
    <>
      <PageHeader description="Overview of current CRM activity." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, hint, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-muted">{label}</p>
                <Icon className="size-4 text-ink-subtle" aria-hidden="true" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
              <p className="mt-1 text-xs text-ink-subtle">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent issues</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            {!recentIssues?.length ? (
              <p className="px-5 py-4 text-sm text-ink-muted">No recent issues.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recentIssues.map(({ id, title, status }) => (
                  <li key={id}>
                    <Link
                      to={`/issues/${id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sunken"
                    >
                      <span className="font-mono text-xs text-ink-subtle">{id}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">
                        {title}
                      </span>
                      {/* The endpoint returns status but not priority, so the
                          badge shows what is actually available. */}
                      <IssueStatusBadge status={status} />
                    </Link>
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
