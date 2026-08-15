import { Badge } from '@/components/ui'
import { ISSUE_CATEGORY, ISSUE_PRIORITY, ISSUE_STATUS } from '../constants'

/**
 * Status carries a dot; priority does not.
 *
 * Status is a live state that moves over an issue's life, priority is a fixed
 * classification. Giving them different visual weight keeps the two columns
 * from reading as the same kind of thing in a dense table.
 */
export function IssueStatusBadge({ status, size = 'sm' }) {
  const meta = ISSUE_STATUS[status]
  if (!meta) return null

  return (
    <Badge tone={meta.tone} size={size} dot>
      {meta.label}
    </Badge>
  )
}

export function IssuePriorityBadge({ priority, size = 'sm' }) {
  const meta = ISSUE_PRIORITY[priority]
  if (!meta) return null

  return (
    <Badge tone={meta.tone} size={size}>
      {meta.label}
    </Badge>
  )
}

/** Bug vs Feature. Neutral-toned so it reads as a label, not a severity. */
export function IssueCategoryBadge({ category, size = 'sm' }) {
  const meta = ISSUE_CATEGORY[category]
  if (!meta) return null

  return (
    <Badge tone="neutral" size={size}>
      {meta.label}
    </Badge>
  )
}
