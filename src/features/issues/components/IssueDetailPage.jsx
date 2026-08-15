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
import { updateIssueStatus } from '../api'
import { useIssue } from '../hooks/useIssue'
import { ISSUE_STATUS, STATUS_OPTIONS } from '../constants'
import { IssueCategoryBadge, IssuePriorityBadge } from './IssueBadge'

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
      // The endpoint answers with the new status alone, so the change is
      // merged into the record already on screen. Refetching the whole issue
      // just to recover fields we never changed would be a wasted round trip.
      const result = await updateIssueStatus(issueId, status)
      applyIssue({ ...issue, status: result.status })
      toast.success('Status updated', {
        description: `${issue.id} is now ${ISSUE_STATUS[result.status]?.label ?? result.status}.`,
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
                <IssueCategoryBadge category={issue.category} />
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

          {/* Read-only: GET /api/issues/:id returns the thread, but there is
              no endpoint to post one, so this renders history rather than
              offering a composer that could not submit. */}
          <Card className="mt-5">
            <CardHeader>
              <CardTitle as="h2" className="text-sm">
                Comments
                {issue.comments.length > 0 && (
                  <span className="ml-1.5 text-ink-subtle">
                    ({issue.comments.length})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {issue.comments.length === 0 ? (
                <p className="text-sm text-ink-subtle italic">
                  No comments on this issue yet.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {issue.comments.map((comment) => (
                    <li key={comment.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                      <Avatar initials={comment.author.initials} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-medium text-ink">
                            {comment.author.name}
                          </span>
                          {comment.author.role && (
                            <span className="text-xs text-ink-subtle">
                              {comment.author.role}
                            </span>
                          )}
                          <time
                            dateTime={comment.createdAt}
                            title={formatDateTime(comment.createdAt)}
                            className="text-xs text-ink-subtle"
                          >
                            {formatRelativeTime(comment.createdAt)}
                          </time>
                        </p>
                        <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-ink-muted">
                          {comment.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
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

                <MetaRow label="Customer">{issue.customer.name}</MetaRow>

                <MetaRow label="Product">{issue.product.name}</MetaRow>

                <MetaRow label="Created">
                  <time dateTime={issue.createdAt} title={formatDateTime(issue.createdAt)}>
                    {formatRelativeTime(issue.createdAt)}
                  </time>
                </MetaRow>

                {/* Stamped by the API the first time an issue reaches
                    Resolved, and cleared again if it is reopened — so its
                    presence is what "done" means here. */}
                {issue.completedAt && (
                  <MetaRow label="Resolved">
                    <time
                      dateTime={issue.completedAt}
                      title={formatDateTime(issue.completedAt)}
                    >
                      {formatRelativeTime(issue.completedAt)}
                    </time>
                  </MetaRow>
                )}
              </dl>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  )
}
