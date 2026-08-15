import { api } from '@/lib/apiClient'
import { unwrap } from '@/lib/apiEnvelope'
import { API_BASE_URL } from '@/config/constants'

/**
 * Company letterhead and default terms.
 *
 *   GET    /api/company        any logged-in   read
 *   PUT    /api/company        company:manage  edit the text fields
 *   POST   /api/company/logo   company:manage  replace the logo (multipart)
 *   DELETE /api/company/logo   company:manage  remove the logo
 *
 * The read is open to everyone because rendering a quotation needs the
 * letterhead, and Support and Developers both view quotations.
 *
 * These details are read LIVE when a quotation is rendered rather than
 * snapshotted onto it, so changing the address or logo updates every
 * quotation at once — including ones raised last month. The default terms are
 * the opposite: they are copied onto a quotation at creation, because the user
 * edits them per quotation and a changed default must not rewrite an offer
 * already sent.
 */

function mapSettings(raw) {
  return {
    companyName: raw.company_name ?? '',
    address: raw.address ?? '',
    phone: raw.phone ?? '',
    email: raw.email ?? '',
    website: raw.website ?? '',
    /** Server path like "/uploads/logo-ab12.png", or '' when none is set. */
    logoPath: raw.logo_path ?? '',
    paymentTerms: raw.payment_terms ?? '',
    termsConditions: raw.terms_conditions ?? '',
    quotationValidityDays: Number(raw.quotation_validity_days ?? 3),
    updatedAt: raw.updated_at ?? null,
  }
}

/**
 * Absolute URL for the logo, for an <img src>.
 *
 * The API returns a server-relative path, but the SPA runs on a different
 * origin in development (5173 vs 3000), so a relative src would resolve
 * against Vite and 404. Derived from API_BASE_URL with the trailing "/api"
 * removed, since /uploads is served from the server root.
 *
 * @param {string} logoPath
 * @returns {string} '' when there is no logo, so callers can test truthiness.
 */
export function logoUrl(logoPath) {
  if (!logoPath) return ''
  const origin = API_BASE_URL.replace(/\/api\/?$/, '')
  return `${origin}${logoPath}`
}

export async function getCompanySettings({ signal } = {}) {
  const payload = await api.get('/company', { signal })
  return mapSettings(unwrap(payload))
}

/**
 * Full replacement of the text fields. The logo is not here — it has its own
 * endpoint, so a text edit can never clear the logo by omission.
 */
export async function updateCompanySettings(input) {
  const payload = await api.put('/company', {
    company_name: input.companyName?.trim(),
    address: input.address?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    website: input.website?.trim() || undefined,
    payment_terms: input.paymentTerms?.trim() || undefined,
    terms_conditions: input.termsConditions?.trim() || undefined,
    quotation_validity_days: Number(input.quotationValidityDays) || 3,
  })
  return mapSettings(unwrap(payload))
}

/**
 * Replace the logo.
 *
 * Sent as FormData, which apiClient passes through untouched — it deliberately
 * does not set Content-Type for FormData, so the browser can add the multipart
 * boundary. Setting it by hand would produce a header with no boundary and the
 * upload would fail.
 *
 * @param {File} file PNG, JPEG, WebP or SVG, 2MB or smaller.
 */
export async function uploadCompanyLogo(file) {
  const body = new FormData()
  body.append('logo', file)

  const payload = await api.post('/company/logo', body)
  return mapSettings(unwrap(payload))
}

export async function deleteCompanyLogo() {
  const payload = await api.delete('/company/logo')
  return mapSettings(unwrap(payload))
}
