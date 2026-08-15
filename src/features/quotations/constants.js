/**
 * Quotation domain vocabulary.
 *
 * Keys are the API's values verbatim — `quotations.status` is
 * enum('Pending','Approved','Rejected') — so a filter value goes straight onto
 * the query string and a response value looks itself up with no translation.
 *
 * Transitions are unrestricted: the API enforces no workflow, so an approved
 * quotation can still be corrected to rejected.
 */

export const QUOTATION_STATUS = {
  Pending: { value: 'Pending', label: 'Pending', tone: 'warning', rank: 0 },
  Approved: { value: 'Approved', label: 'Approved', tone: 'success', rank: 1 },
  Rejected: { value: 'Rejected', label: 'Rejected', tone: 'danger', rank: 2 },
}

export const QUOTATION_STATUS_OPTIONS = Object.values(QUOTATION_STATUS)
  .sort((a, b) => a.rank - b.rank)
  .map(({ value, label }) => ({ value, label }))
