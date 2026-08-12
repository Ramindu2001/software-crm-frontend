import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, TriangleAlert } from 'lucide-react'
import { EmptyState } from '@/components/common'
import {
  Avatar,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  Spinner,
} from '@/components/ui'
import { formatDateTime, formatRelativeTime } from '@/lib/format'
import { toast } from '@/lib/toastStore'
import { updateIssue } from '../api'
import { useIssue } from '../hooks/useIssue'
import { ISSUE_STATUS, STATUS_OPTIONS } from '../constants'
import { IssuePriorityBadge } from './IssueBadge'

function MetaRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-ink">{children}</dd>
    </div>
  )
}

export function IssueDetailPage() {
  const { issueId } = useParams()
  const { issue, isLoading, error, applyIssue } = useIssue(issueId)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState(null)

  const handleStatusChange = async (event) => {
    const status = event.target.value
    setIsUpdating(true)
    setUpdateError(null)

    try {
      const updated = await updateIssue(issueId, { status })
      // Apply the returned record rather than refetching — the API already
      // gave us the authoritative version.
      applyIssue(updated)
      toast.success('Status updated', {
        description: `${updated.id} is now ${ISSUE_STATUS[status]?.label ?? status}.`,
      })
    } catch (caught) {
      setUpdateError(caught.message ?? 'Could not update the status.')
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading && !issue) {
    return (
      <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-ink-subtle">
        <Spinner className="size-5" />
        <span className="text-sm">Loading issue…</span>
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Issue not found"
        description={error.message ?? 'This issue may have been deleted.'}
        action={
          <Button as={Link} to="/issues" size="sm">
            Back to issues
          </Button>
        }
      />
    )
  }

  if (!issue) return null

  return (
    <>
      <Link
        to="/issues"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to issues
      </Link>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-ink-subtle">
                  {issue.id}
                </span>
                <IssuePriorityBadge priority={issue.priority} />
              </div>
              <CardTitle as="h2" className="mt-2 text-lg">
                {issue.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {issue.description ? (
                <p className="text-sm leading-relaxed whitespace-pre-line text-ink-muted">
                  {issue.description}
                </p>
              ) : (
                <p className="text-sm text-ink-subtle italic">
                  No description was provided.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside>
          <Card>
            <CardHeader>
              <CardTitle as="h2" className="text-sm">
                Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                label="Status"
                value={issue.status}
                onChange={handleStatusChange}
                options={STATUS_OPTIONS}
                disabled={isUpdating}
                error={updateError ?? undefined}
              />

              <dl className="mt-4 divide-y divide-line border-t border-line">
                <MetaRow label="Assignee">
                  {issue.assignee ? (
                    <span className="flex items-center justify-end gap-2">
                      <Avatar initials={issue.assignee.initials} size="sm" />
                      <span className="truncate">{issue.assignee.name}</span>
                    </span>
                  ) : (
                    <span className="text-ink-subtle">Unassigned</span>
                  )}
                </MetaRow>

                <MetaRow label="Customer">{issue.customer}</MetaRow>

                <MetaRow label="Reporter">
                  <span className="block truncate">{issue.reporter.name}</span>
                  {issue.reporter.email && (
                    <span className="block truncate text-xs text-ink-subtle">
                      {issue.reporter.email}
                    </span>
                  )}
                </MetaRow>

                <MetaRow label="Created">
                  <time dateTime={issue.createdAt} title={formatDateTime(issue.createdAt)}>
                    {formatRelativeTime(issue.createdAt)}
                  </time>
                </MetaRow>

                <MetaRow label="Updated">
                  <time dateTime={issue.updatedAt} title={formatDateTime(issue.updatedAt)}>
                    {formatRelativeTime(issue.updatedAt)}
                  </time>
                </MetaRow>
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  )
}
