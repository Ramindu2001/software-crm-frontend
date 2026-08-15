# Synnex CMS — Frontend Architecture

Feature-sliced architecture. Code is grouped by **what it does for the user**,
not by what technical kind of file it is.

## Layout

```
src/
├── app/                 App composition: providers, router setup
│   ├── providers/       App-only context providers (theme, query client)
│   └── router/          Route definitions and guards
├── assets/              Static images, icons, fonts
├── components/
│   ├── ui/              Design-system primitives (no business logic)
│   └── common/          Shared app-aware components (2+ features)
├── config/              Constants and environment access
├── features/            Vertical slices — the bulk of the app
│   └── issues/          Reference example of a feature's shape
│       ├── api/         Data fetching for this feature
│       ├── components/  Components only this feature uses
│       ├── hooks/       Logic only this feature uses
│       └── index.js     Public API (barrel) — the ONLY entry point
├── hooks/               Globally reusable hooks
├── layouts/             Page shells (DashboardLayout, AuthLayout)
├── lib/                 Third-party wiring and pure helpers
└── index.css            Tailwind entry + design tokens
```

`auth/`, `customers/`, `dashboard/`, `issues/`, `products/` and `quotations/`
all follow this shape. Add new features the same way — don't pre-create empty
ones.

## Where does a component go?

| Question | Answer |
| --- | --- |
| Could I paste it into an unrelated product unchanged? | `components/ui/` |
| Knows Synnex conventions, used by 2+ features? | `components/common/` |
| Mentions a domain noun (issue, customer, ticket)? | `features/<x>/components/` |

## Rules

1. **Dependencies point one way:**
   `app → features → components/common → components/ui → lib`
   Nothing imports back up the chain.
2. **Features are islands.** A feature never imports another feature's
   internals — only its `index.js` barrel. If two features need the same
   thing, it belongs in `components/common`, `hooks/` or `lib/`.

   Domain-owned global state lives with its feature, not in `app/providers/`.
   Auth is the example: `features/auth` exports `AuthProvider` and `useAuth`,
   `app/` composes the provider, and layouts and other features read the hook
   through the barrel. Putting it in `app/` would force `features → app`
   imports and invert rule 1. Reserve `app/providers/` for context with no
   domain of its own, such as a theme or query client.
3. **`components/ui` stays dumb.** No API calls, no router, no app state.
   Presentational only, driven entirely by props.
4. **Environment variables are read only in `config/`.** The one deliberate
   exception is the `VITE_*_API` swap flags in each feature's `api/index.js`,
   which must read `import.meta.env` directly — routing them through a
   re-exported constant defeats Vite's build-time replacement and the dead-code
   elimination that depends on it.

## Talking to the backend

The API is the Express + MySQL service in `../software-crm-backend`, on
`http://localhost:3000/api`:

```
npm run migrate   # access-control tables + permission grants (idempotent)
npm run seed      # three roles, one user per role, sample catalogue
npm run dev
```

`migrate` must run before the app will authenticate — `authenticate()` reads
`users.is_active` and the `role_permissions` table, both of which it creates.

`lib/apiClient.js` wraps `fetch`. It never imports a feature: the auth token
and the 401 handler are registered from `AuthProvider` via
`configureApiClient()`, which keeps `lib/` at the bottom of the dependency
chain and makes the client testable with no React in scope.

Every response is enveloped:

```
success  { "success": true,  "message": "...", "data": ..., "meta"?: {...} }
failure  { "success": false, "message": "...", "errors"?: ["...", "..."] }
```

`apiClient` unwraps only the failure half, turning `errors` into
`ApiError.messages` — a **flat string array**, sometimes indexed
(`"items[1]: quantity must be at least 1"`), not per-field. Render it with
`<ApiErrorAlert error={…} />`. `lib/apiEnvelope.js` handles the success half:
`unwrap()`, `pageResult()` for server-paginated endpoints, and `paginate()`
for the unpaginated master-data ones.

Pagination meta is **camelCase** — `{ total, currentPage, lastPage, perPage }`
— and the request param is `perPage`, not `per_page`.

Each feature's `api/` folder holds two interchangeable implementations behind
a selector:

```
features/issues/api/
├── issues.mock.js   Mock data and simulated latency
├── issues.http.js   Real endpoints via lib/apiClient
└── index.js         Picks one from VITE_ISSUES_API
```

Both must expose the **same function signatures and return shapes**, including
where the API returns *less* than you'd expect — `updateIssueStatus` resolves
to `{ status }` alone, and `createQuotation` to a reference plus totals, so
both mocks do the same. Nothing above `api/` may know which is active.

Requests that must not trigger the global 401 handler — login, and the session
bootstrap — pass `handleUnauthorized: false`. A 401 there means "wrong
password" or "stale token", not "your live session just died".

### Domain vocabulary comes from the API

`features/*/constants.js` use the server's enum values verbatim as keys —
`'Open'`, `'In Progress'`, `'QA'`, `'Resolved'`; `'High' | 'Medium' | 'Low'`;
`'Pending' | 'Approved' | 'Rejected'`; `'Software' | 'Service'`. A filter value
goes straight onto the query string and a response value looks itself up with
no translation table in between. Anything outside the enum is a 422.

There is no `Critical` priority and no `Closed` status. Adding either needs an
`ALTER TABLE` on the enum first.

### What the API does not do

Worth knowing before building against it:

- **No `GET /api/customers/:id`.** The list carries every column, `address`
  included, and POST/PUT both return the full row — so nothing needs to fetch
  one customer on its own. `getCustomer` narrows the list.
- **No customer or user DELETE.** Both are referenced by history that would be
  orphaned. Deactivation is the soft delete for users; customers have none,
  because the table has no status column.
- **No `updated_at` on tickets.** Only `created_at`, so "recently updated"
  ordering does not exist.
- **No DELETE anywhere.** Products, customers and the rest are referenced with
  `ON DELETE RESTRICT`, so anything with history cannot be removed. Products
  have `PATCH /:id/status` as a soft delete; customers have no equivalent,
  because the table has no status column.
- **`PUT` is a full replacement**, on both `/customers/:id` and
  `/products/:id`. An omitted optional field is set to NULL, not left alone —
  which is what an edit form wants, but makes a partial body destructive. Send
  the whole record.
- **Customer email is unique**, enforced in the controller rather than by an
  index, so a clash is a 409 whose message names the customer already holding
  it. `createCustomer`/`updateCustomer` translate that to a
  `DuplicateEmailError` carrying `field: 'email'`, which the form binds to the
  input.
- **Unpaginated master data.** `/customers`, `/products` and `/users` return
  everything — they exist to fill pickers. Their `api/` modules page the result
  client-side so the hooks cannot tell the difference.

### Permissions

Authorisation is **server-driven**, not a table baked into the bundle. An admin
can change what each role may do at runtime, so the frontend must gate on the
rules in force now rather than the ones that were true at build time.

`POST /api/auth/login` and `GET /api/auth/me` both return the caller's
effective grant list. `features/auth/permissions.js` reads it:

```js
const { can } = useAuth()
if (can(PERMISSIONS.PRODUCTS_WRITE)) { /* render the control */ }
```

`can()` fails closed on every uncertain input — no user, no permission array,
or an unknown key — so a typo hides a control rather than showing one that
403s. `canAll` and `canAny` cover routes and navigation.

Gating happens at three depths, and only the last one is access control:

| Layer | What it does | Where |
| --- | --- | --- |
| Navigation | Hides links to unreachable sections | `config/navigation.js`, filtered in `Sidebar` |
| Route | Blocks direct URL entry with an explanation | `RequirePermission` in `app/router/guards.jsx` |
| API | Actually enforces it | `requirePermission()` on every backend route |

The first two exist so nobody meets a dead end. They are presentation. A URL
typed by hand still reaches the route, and the server still says no.

The catalogue lives in the backend's `utils/permissions.js` and is mirrored as
`PERMISSIONS` in `features/auth/permissions.js`. Adding one means changing
both, guarding a route with it, and running `npm run migrate`.

**Live sessions see permission changes on the next `/me`** — that is, on
reload. A revoked permission takes effect on the API immediately, so the worst
case is a button that renders until refresh and then 403s if pressed, not
access that outlives the revoke.

### Quotations are documents, not rows

A quotation is an offer with a validity window and terms attached, so
`features/quotations` is built around one rule: **what the customer was sent
must never change.**

Line items carry a *snapshot* — product name, package name, all three fees, the
package's features and the product's requirements — copied when the quotation
is created. Nothing in the document joins to live product data, so repricing or
renaming a product leaves issued quotations untouched. Editing a product even
regenerates its package ids (`PUT /api/products/:id` deletes and reinserts
them), which is exactly why `quotation_items.package_id` carries no foreign key
and the snapshot is what renders.

The one deliberate exception is the **company letterhead**, read live from
`company_settings` on every detail response, so a new address or logo applies to
every quotation at once. Default terms sit in between: copied onto a quotation
at creation, then editable per quotation, so changing the company default never
rewrites an offer already sent.

```
features/quotations/
├── api/                 list, detail, create, update, status
├── components/
│   ├── QuotationDocument.jsx    the printed sheet — used by BOTH the
│   │                            detail view and the print route, so there
│   │                            is no second template to keep in sync
│   ├── QuotationFormPage.jsx    the builder
│   ├── QuotationDetailPage.jsx
│   └── QuotationPrintPage.jsx   mounted OUTSIDE the dashboard shell
└── hooks/useQuotationBuilder.js product cache + derived pricing
```

`/quotations/:id/print` is a top-level route rather than a child of
`DashboardLayout`: a print view has to be the document and nothing else, and
`print:hidden` on an entire app shell is a worse answer than not rendering it.
Printing is the browser's — `@page` sets A4 and `print-color-adjust: exact`
keeps the template's blue section bars, which browsers strip by default.

Pricing is server-computed and never read from the request. The plan picks the
fee: **Annual → first-year fee** (with the renewal shown from year two),
**Monthly → monthly price**. The builder's running total is a preview only.

### Access control lives in `features/users`

Team members and role permissions are one feature, not two: a role is only
meaningful through the users holding it, the matrix shows per-role user counts,
and both sit behind the same administration surface. Splitting them would mean
two features importing each other's internals, which rule 2 forbids.

`features/settings` is a shell — it owns the page title and the routed tab bar,
and `app/router` composes the sections into it.

Three safety rules are enforced by the API and mirrored in the UI so nobody
discovers them via a 409:

- the **Admin role is locked** and always holds every permission — `roles:manage`
  is itself a permission, so it must not be removable
- you cannot **deactivate your own account**
- you cannot **deactivate or demote the last active Admin**

## Imports

Use the `@/` alias — it maps to `src/`. Configured in `vite.config.js`
(bundler) and `jsconfig.json` (editor IntelliSense); both must stay in sync.

```js
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/config/constants'
```

Avoid `../../../` traversal. Relative imports are fine *within* a single
feature, where they signal that the files belong together.
