/**
 * Lead API surface.
 *
 * ── Why there is no leads.mock.js ──
 * Every other feature carries a mock implementation behind a `VITE_*_API`
 * flag. Those exist for a reason that does not apply here: they were written
 * while the backend was still being built, so the UI had something to develop
 * against, and the flag let each feature cut over independently. Every one of
 * them now reads `=http`.
 *
 * Leads shipped with its backend, so there was never a gap to fill. A second
 * implementation of this contract would be ~500 lines that nothing selects,
 * that no test exercises, and that silently rots the first time the real
 * endpoint's shape changes. Adding it for symmetry would cost more than the
 * symmetry is worth.
 *
 * If a mock is ever wanted — for offline demos or component tests — the shape
 * to satisfy is exactly what leads.http.js exports, and this barrel is where
 * the switch would go, matching the pattern in the other features.
 */

export {
  listLeads,
  getLeadStats,
  getLead,
  createLead,
  updateLead,
  updateLeadStatus,
  logLeadActivity,
  addLeadRequirement,
  updateLeadRequirement,
  deleteLeadRequirement,
  convertLead,
  listOwners,
  listProducts,
  listCustomers,
  NotFoundError,
} from './leads.http'
