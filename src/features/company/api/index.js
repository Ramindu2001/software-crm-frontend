import * as mockImpl from './company.mock'
import * as httpImpl from './company.http'

/**
 * Selects the company-settings implementation.
 *
 * Shares the quotations flag rather than adding one of its own: company
 * settings exist to render quotations, and a build where one is mocked and the
 * other is not would produce a quotation with a letterhead from a different
 * world.
 */
const USE_HTTP = import.meta.env.VITE_QUOTATIONS_API === 'http'

const impl = USE_HTTP ? httpImpl : mockImpl

export const getCompanySettings = impl.getCompanySettings
export const updateCompanySettings = impl.updateCompanySettings
export const uploadCompanyLogo = impl.uploadCompanyLogo
export const deleteCompanyLogo = impl.deleteCompanyLogo
/** Turns the stored server path into an absolute URL for an <img src>. */
export const logoUrl = impl.logoUrl

export const IS_MOCK_COMPANY = !USE_HTTP
