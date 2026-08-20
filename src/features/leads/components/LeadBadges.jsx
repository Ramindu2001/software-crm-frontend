import { Badge } from '@/components/ui'
import {
  LEAD_SOLUTION_TYPE,
  LEAD_STATUS,
  REQUIREMENT_PRIORITY,
  REQUIREMENT_STATUS,
} from '../constants'

/**
 * Domain badges.
 *
 * Each reads its tone from the constants table rather than taking one as a
 * prop, so a status renders identically in the table, on the detail page and
 * in the pipeline board. Unknown values fall back to a neutral badge showing
 * the raw string — better than rendering nothing if the API gains an enum
 * value before the UI knows about it.
 */

const fallback = (value) => ({ label: value ?? '—', tone: 'neutral' })

export function LeadStatusBadge({ status, size = 'md' }) {
  const entry = LEAD_STATUS[status] ?? fallback(status)
  return (
    <Badge tone={entry.tone} size={size} dot>
      {entry.label}
    </Badge>
  )
}

export function SolutionTypeBadge({ solutionType, size = 'md' }) {
  const entry = LEAD_SOLUTION_TYPE[solutionType] ?? fallback(solutionType)
  return (
    <Badge tone={entry.tone} size={size}>
      {entry.label}
    </Badge>
  )
}

export function RequirementStatusBadge({ status, size = 'sm' }) {
  const entry = REQUIREMENT_STATUS[status] ?? fallback(status)
  return (
    <Badge tone={entry.tone} size={size}>
      {entry.label}
    </Badge>
  )
}

export function RequirementPriorityBadge({ priority, size = 'sm' }) {
  const entry = REQUIREMENT_PRIORITY[priority] ?? fallback(priority)
  return (
    <Badge tone={entry.tone} size={size}>
      {entry.label}
    </Badge>
  )
}
