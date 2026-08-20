/**
 * Public API for the `leads` feature.
 *
 * Leads are the pipeline in front of customers: an enquiry arrives as a phone
 * number, gets worked through calls and requirement gathering, and ends either
 * as a customer record (won) or as a recorded loss.
 *
 * Only the two routed pages are exported. Everything else — the dialogs, the
 * timeline, the requirements panel — is internal to those two screens, and
 * exporting them would invite a second caller that has to be kept in step.
 */

export { LeadsPage } from './components/LeadsPage'
export { LeadDetailPage } from './components/LeadDetailPage'

export { LEAD_STATUS, LEAD_SOLUTION_TYPE, isOpen } from './constants'
