/**
 * Role vocabulary for the admin screens.
 *
 * Keys are the API's values verbatim — `roles.name` is
 * enum('Admin','Support','Developer') — so a filter value goes straight onto
 * the query string and a response value looks itself up with no translation.
 *
 * `blurb` describes what the role is FOR, not what it can do. What it can do
 * is the permission matrix's job and changes at runtime, so duplicating it
 * here would go stale the first time an admin edits a grant.
 */
export const USER_ROLE = {
  Admin: {
    value: 'Admin',
    label: 'Admin',
    tone: 'brand',
    blurb: 'Runs the workspace, including team members and permissions.',
  },
  Support: {
    value: 'Support',
    label: 'Support',
    tone: 'info',
    blurb: 'Customer-facing work — issues, quotations and customer records.',
  },
  Developer: {
    value: 'Developer',
    label: 'Developer',
    tone: 'neutral',
    blurb: 'Works the issue queue and moves tickets through the workflow.',
  },
}

export const USER_ROLE_OPTIONS = Object.values(USER_ROLE).map(
  ({ value, label }) => ({ value, label }),
)

/**
 * Status filter for the directory. Not a schema enum — `users.is_active` is a
 * boolean — but a tri-state reads better than an is_active dropdown whose
 * "any" option is an empty string.
 */
export const USER_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Deactivated' },
]

/** Matches the API's floor; bcrypt silently ignores anything past 72 bytes. */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72
