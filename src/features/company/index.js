/**
 * Public API for the `company` feature.
 *
 * The letterhead and default quotation terms. Kept separate from `settings`
 * (which is only a shell) and from `quotations` (which consumes it) so the
 * dependency runs one way: quotations reads company, never the reverse.
 */

export { CompanySettingsPage } from './components/CompanySettingsPage'
export { useCompanySettings } from './hooks/useCompanySettings'
export { logoUrl } from './api'
