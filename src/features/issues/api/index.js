import * as mockImpl from './issues.mock'
import * as httpImpl from './issues.http'

/**
 * Selects the issues implementation.
 *
 * Set VITE_ISSUES_API=http to point at the real backend. The flag is per
 * feature, so issues can migrate independently of auth.
 *
 * `import.meta.env` is read directly here (not via config/constants.js) so
 * Vite's build-time replacement lets the comparison fold to a constant.
 */
const USE_HTTP = import.meta.env.VITE_ISSUES_API === 'http'

const impl = USE_HTTP ? httpImpl : mockImpl

export const listIssues = impl.listIssues
export const getIssue = impl.getIssue
export const createIssue = impl.createIssue
/**
 * Status is the only mutable field: the API exposes PATCH /:id/status and no
 * general-purpose update, so there is deliberately no `updateIssue` here.
 */
export const updateIssueStatus = impl.updateIssueStatus
export const listAssignees = impl.listAssignees
export const listCustomers = impl.listCustomers
export const listProducts = impl.listProducts
export const NotFoundError = impl.NotFoundError

export const IS_MOCK_ISSUES = !USE_HTTP
