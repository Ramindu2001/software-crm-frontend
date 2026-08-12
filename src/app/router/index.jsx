import { createBrowserRouter, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { NotFoundPage } from './NotFoundPage'
import {
  CustomersPage,
  DashboardPage,
  IssueDetailPage,
  IssuesPage,
  ReportsPage,
  SettingsPage,
} from './lazyPages'

/**
 * Application routes.
 *
 * `handle.title` is read by the Topbar via useMatches(), which keeps each
 * page's title colocated with its route rather than pushed up from the page.
 *
 * Uses createBrowserRouter (the data router) rather than <BrowserRouter> so
 * route loaders and actions are available when the data layer lands.
 *
 * Pages are lazily loaded (see ./lazyPages) so each feature ships as its own
 * chunk. The Suspense boundary lives inside DashboardLayout, so the shell
 * stays painted while a chunk downloads.
 *
 * NotFoundPage stays eager: it is tiny, shares its dependencies with the rest
 * of the app, and a separate request to render an error is a poor trade.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: <DashboardPage />,
        handle: { title: 'Dashboard' },
      },
      {
        path: 'issues',
        element: <IssuesPage />,
        handle: { title: 'Issues' },
      },
      {
        path: 'issues/:issueId',
        element: <IssueDetailPage />,
        // A function title lets the dynamic route show the issue reference.
        handle: { title: (match) => match.params.issueId },
      },
      {
        path: 'customers',
        element: <CustomersPage />,
        handle: { title: 'Customers' },
      },
      {
        path: 'reports',
        element: <ReportsPage />,
        handle: { title: 'Reports' },
      },
      {
        path: 'settings',
        element: <SettingsPage />,
        handle: { title: 'Settings' },
      },
      // Unmatched paths keep the shell so navigation stays available.
      {
        path: '*',
        element: <NotFoundPage />,
        handle: { title: 'Not found' },
      },
    ],
  },
])
