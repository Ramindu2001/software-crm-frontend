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

Only `issues/` is scaffolded. Create `auth/`, `customers/`, `dashboard/` with
the same internal shape as we build them — don't pre-create empty features.

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
4. **Environment variables are read only in `config/`.**

## Imports

Use the `@/` alias — it maps to `src/`. Configured in `vite.config.js`
(bundler) and `jsconfig.json` (editor IntelliSense); both must stay in sync.

```js
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/config/constants'
```

Avoid `../../../` traversal. Relative imports are fine *within* a single
feature, where they signal that the files belong together.
