/**
 * Public API for the `issues` feature.
 *
 * Other features and app-level code import ONLY from this barrel — never from
 * `features/issues/components/...` directly. That keeps the feature free to
 * reorganise its internals without breaking the rest of the app, and makes
 * cross-feature coupling visible in one place.
 */

export { IssuesPage } from './components/IssuesPage'
