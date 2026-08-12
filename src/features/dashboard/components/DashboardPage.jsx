import { CircleDot, Clock, TrendingUp, Users } from 'lucide-react'
import { PageHeader } from '@/components/common'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'

// Placeholder data — replaced once the dashboard feature has an api/ layer.
const STATS = [
  { label: 'Open issues', value: '42', delta: '+6 this week', icon: CircleDot },
  { label: 'Avg. resolution', value: '1.8d', delta: '-0.3d', icon: Clock },
  { label: 'Active customers', value: '128', delta: '+4', icon: Users },
  { label: 'Resolved this month', value: '96', delta: '+18%', icon: TrendingUp },
]

const RECENT_ISSUES = [
  { id: 'SYN-1042', title: 'Login fails on Safari', tone: 'danger', status: 'Critical' },
  { id: 'SYN-1041', title: 'Export CSV times out', tone: 'warning', status: 'High' },
  { id: 'SYN-1039', title: 'Add bulk assign action', tone: 'info', status: 'In Progress' },
  { id: 'SYN-1036', title: 'Fix avatar upload crop', tone: 'success', status: 'Resolved' },
]

export function DashboardPage() {
  return (
    <>
      <PageHeader
        description="Overview of issue volume and team throughput."
        actions={<Button size="sm">New issue</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map(({ label, value, delta, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-muted">{label}</p>
                <Icon className="size-4 text-ink-subtle" aria-hidden="true" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
              <p className="mt-1 text-xs text-ink-subtle">{delta}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent issues</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          <ul className="divide-y divide-line">
            {RECENT_ISSUES.map(({ id, title, tone, status }) => (
              <li
                key={id}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sunken"
              >
                <span className="font-mono text-xs text-ink-subtle">{id}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {title}
                </span>
                <Badge tone={tone} size="sm" dot>
                  {status}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  )
}
