import { lazy } from 'react'

/**
 * Lazily loaded route components — one chunk per feature.
 *
 * Kept separate from the router config because Fast Refresh only works when a
 * module exports components exclusively; mixing these with the `router` export
 * would break HMR for the whole routing module.
 *
 * The .then() mapping is needed because feature barrels use named exports
 * while React.lazy expects a module with a `default`.
 */
export const DashboardPage = lazy(() =>
  import('@/features/dashboard').then((m) => ({ default: m.DashboardPage })),
)

export const IssuesPage = lazy(() =>
  import('@/features/issues').then((m) => ({ default: m.IssuesPage })),
)

export const IssueDetailPage = lazy(() =>
  import('@/features/issues').then((m) => ({ default: m.IssueDetailPage })),
)

export const CustomersPage = lazy(() =>
  import('@/features/customers').then((m) => ({ default: m.CustomersPage })),
)

export const ReportsPage = lazy(() =>
  import('@/features/reports').then((m) => ({ default: m.ReportsPage })),
)

export const SettingsPage = lazy(() =>
  import('@/features/settings').then((m) => ({ default: m.SettingsPage })),
)
