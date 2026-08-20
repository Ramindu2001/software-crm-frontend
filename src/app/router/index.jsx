import { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { FullPageLoader } from '@/components/common'
import { LoginPage, PERMISSIONS } from '@/features/auth'
import { NotFoundPage } from './NotFoundPage'
import { RequireAuth, RequireGuest, RequirePermission } from './guards'
import {
  CustomersPage,
  DashboardPage,
  IssueDetailPage,
  IssuesPage,
  LeadsPage,
  LeadDetailPage,
  ReportsPage,
  SettingsLayout,
  ProfileSettingsPage,
  UsersPage,
  RolesPage,
  QuotationsPage,
  QuotationFormPage,
  QuotationDetailPage,
  QuotationPrintPage,
  CompanySettingsPage,
  ProductsPage,
  ProductDetailPage,
  ProductFormPage,
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
    // Loaded eagerly rather than lazily: this is the first paint for anyone
    // without a session, and an extra round trip there is the wrong trade.
    path: '/login',
    element: (
      <RequireGuest>
        <LoginPage />
      </RequireGuest>
    ),
  },
  {
    /**
     * The printable quotation, deliberately OUTSIDE the dashboard shell.
     *
     * A print view has to be the document and nothing else — sharing the
     * layout would mean printing around a sidebar, and `print:hidden` on the
     * whole shell is a worse answer than not rendering it. Still behind
     * RequireAuth: it is a customer's pricing.
     */
    path: '/quotations/:quotationId/print',
    element: (
      <RequireAuth>
        <Suspense fallback={<FullPageLoader label="Preparing the quotation…" />}>
          <QuotationPrintPage />
        </Suspense>
      </RequireAuth>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <DashboardLayout />
      </RequireAuth>
    ),
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
        // Guarded rather than left open like Issues: the pipeline is
        // commercially sensitive in a way the support queue is not, and
        // Developers hold leads:view precisely so the guard is meaningful.
        path: 'leads',
        element: (
          <RequirePermission permissions={[PERMISSIONS.LEADS_VIEW]}>
            <LeadsPage />
          </RequirePermission>
        ),
        handle: { title: 'Leads' },
      },
      {
        path: 'leads/:leadId',
        element: (
          <RequirePermission permissions={[PERMISSIONS.LEADS_VIEW]}>
            <LeadDetailPage />
          </RequirePermission>
        ),
        // A function title lets the dynamic route show the lead reference.
        handle: { title: (match) => match.params.leadId },
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
        path: 'products',
        element: <ProductsPage />,
        handle: { title: 'Products' },
      },
      {
        path: 'products/new',
        element: <ProductFormPage />,
        handle: { title: 'New Product' },
      },
      {
        path: 'products/:productId',
        element: <ProductDetailPage />,
        handle: { title: (match) => `Product ${match.params.productId}` },
      },
      {
        path: 'products/:productId/edit',
        element: <ProductFormPage />,
        handle: { title: 'Edit Product' },
      },
      {
        path: 'quotations',
        element: <QuotationsPage />,
        handle: { title: 'Quotations' },
      },
      {
        // Before ':quotationId', so "new" is never read as a reference.
        path: 'quotations/new',
        element: (
          <RequirePermission permissions={[PERMISSIONS.QUOTATIONS_CREATE]}>
            <QuotationFormPage />
          </RequirePermission>
        ),
        handle: { title: 'New quotation' },
      },
      {
        path: 'quotations/:quotationId',
        element: <QuotationDetailPage />,
        // A function title lets the dynamic route show the reference.
        handle: { title: (match) => match.params.quotationId },
      },
      {
        path: 'quotations/:quotationId/edit',
        element: (
          <RequirePermission permissions={[PERMISSIONS.QUOTATIONS_CREATE]}>
            <QuotationFormPage />
          </RequirePermission>
        ),
        handle: { title: 'Edit quotation' },
      },
      {
        // Settings is a shell with routed sub-sections, so each one is
        // linkable and survives a refresh. The permission guards sit on the
        // children rather than the layout: Profile is for everyone, and only
        // the administration sections are restricted.
        path: 'settings',
        element: <SettingsLayout />,
        handle: { title: 'Settings' },
        children: [
          { index: true, element: <ProfileSettingsPage /> },
          {
            path: 'users',
            element: (
              <RequirePermission permissions={[PERMISSIONS.USERS_VIEW]}>
                <UsersPage />
              </RequirePermission>
            ),
            handle: { title: 'Team members' },
          },
          {
            path: 'roles',
            element: (
              <RequirePermission permissions={[PERMISSIONS.ROLES_MANAGE]}>
                <RolesPage />
              </RequirePermission>
            ),
            handle: { title: 'Roles & permissions' },
          },
          {
            // Readable by anyone — the letterhead is not a secret, and the
            // page disables its own controls without company:manage.
            path: 'company',
            element: <CompanySettingsPage />,
            handle: { title: 'Company details' },
          },
        ],
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
