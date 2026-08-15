/**
 * Public API for the `settings` feature.
 *
 * Settings is a shell: it owns the page title and the routed tab bar, and the
 * sections themselves come from whichever feature owns them. Team members and
 * roles live in `features/users` and are composed into these routes by
 * app/router, so settings never reaches into another feature's internals.
 */

export { SettingsLayout } from './components/SettingsLayout'
export { ProfileSettingsPage } from './components/ProfileSettingsPage'
