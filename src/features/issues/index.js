/**
 * Public API for the `issues` feature.
 *
 * Other features and app-level code import ONLY from this barrel — never from
 * `features/issues/components/...` directly. That keeps the feature free to
 * reorganise its internals without breaking the rest of the app, and makes
 * cross-feature coupling visible in one place.
 */

export { IssuesPage } from './components/IssuesPage'
export { IssueDetailPage } from './components/IssueDetailPage'

// Exported for cross-feature reuse (e.g. an issues widget on the dashboard).
export { IssueStatusBadge, IssuePriorityBadge } from './components/IssueBadge'
export { useIssues } from './hooks/useIssues'
export { ISSUE_STATUS, ISSUE_PRIORITY } from './constants'
