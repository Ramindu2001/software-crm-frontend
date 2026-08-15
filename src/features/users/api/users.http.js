import { api } from '@/lib/apiClient'
import { deriveInitials, paginate, unwrap } from '@/lib/apiEnvelope'

/**
 * Team members and the role permissions that govern them.
 *
 *   GET   /api/users                  users:view    directory
 *   GET   /api/users/:id              users:view    one user
 *   POST  /api/users                  users:manage  create
 *   PUT   /api/users/:id              users:manage  edit name, email, role
 *   PATCH /api/users/:id/status       users:manage  activate / deactivate
 *   PATCH /api/users/:id/password     users:manage  admin reset
 *   GET   /api/roles                  roles:manage  roles + grants + counts
 *   GET   /api/permissions            roles:manage  the catalogue
 *   PUT   /api/roles/:id/permissions  roles:manage  replace grants
 *
 * Two things to know:
 *
 *   1. `GET /api/users` defaults to ACTIVE users only. That default is what
 *      the assignment picker needs — a deactivated developer must not be
 *      offered new work — so the admin directory passes `status: 'all'`
 *      explicitly to see everyone.
 *
 *   2. There is no DELETE. Users are referenced by ticket_comments.user_id and
 *      tickets.assigned_developer_id, so removing someone would erase
 *      authorship from comment threads. Deactivation is the soft delete: it
 *      blocks login on the very next request and drops them from the pickers
 *      while leaving history intact.
 */

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

/**
 * Thrown when the email belongs to another user.
 *
 * Its own type, carrying `field`, because a 409 here is a field-level problem
 * the form can point at rather than a generic failure.
 */
export class DuplicateEmailError extends Error {
  constructor(message) {
    super(message)
    this.name = 'DuplicateEmailError'
    this.status = 409
    this.field = 'email'
  }
}

/**
 * Thrown when a write is refused to keep the system administrable —
 * deactivating your own account, or removing the last active Admin.
 *
 * Separated from a generic 409 because these are not user error in the
 * validation sense; they are the system declining to let someone lock
 * everyone out, and the UI words them differently.
 */
export class SafetyRuleError extends Error {
  constructor(message) {
    super(message)
    this.name = 'SafetyRuleError'
    this.status = 409
  }
}

/** UI sort keys mapped to the columns the API will order by. */
const SORT_COLUMNS = {
  id: 'id',
  name: 'name',
  email: 'email',
  role: 'role',
  createdAt: 'created_at',
}

const DEFAULT_SORT_KEY = 'name'

function mapUser(raw) {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    isActive: Boolean(raw.is_active),
    mustChangePassword: Boolean(raw.must_change_password),
    createdAt: raw.created_at,
    initials: deriveInitials(raw.name),
  }
}

function mapRole(raw) {
  return {
    id: raw.id,
    name: raw.name,
    usersCount: Number(raw.users_count ?? 0),
    activeUsersCount: Number(raw.active_users_count ?? 0),
    /**
     * Admin is locked server-side: `roles:manage` is itself a permission, so
     * an admin who unticked it would remove the only route back into
     * administration. The flag ships in the payload so the matrix renders that
     * column as read-only rather than letting a user discover it via a 409.
     */
    isLocked: Boolean(raw.is_locked),
    permissions: raw.permissions ?? [],
  }
}

/** 409 covers two different situations here; the message distinguishes them. */
function translateWriteError(error) {
  if (error.status === 409) {
    return /already uses the email/i.test(error.message)
      ? new DuplicateEmailError(error.message)
      : new SafetyRuleError(error.message)
  }
  if (error.status === 404) {
    return new NotFoundError(error.message)
  }
  return error
}

// ── Users ────────────────────────────────────────────────

/**
 * The user directory, filtered and sorted server-side, paged here.
 *
 * The endpoint is unpaginated — it doubles as the assignment picker — so the
 * slicing happens in this layer, which keeps the hook from being able to tell
 * this feature from a server-paginated one.
 *
 * @param {object} [params]
 * @param {'active'|'inactive'|'all'} [params.status]
 * @returns {Promise<{data: Array, total: number, filteredTotal: number,
 *   currentPage: number, lastPage: number, perPage: number}>}
 */
export async function listUsers({
  query = '',
  role = '',
  status = 'all',
  sortBy = DEFAULT_SORT_KEY,
  sortDir = 'asc',
  page = 1,
  perPage = 10,
  signal,
} = {}) {
  const column = SORT_COLUMNS[sortBy] ?? SORT_COLUMNS[DEFAULT_SORT_KEY]

  const payload = await api.get('/users', {
    params: {
      search: query,
      role,
      status,
      sort: `${column}:${sortDir}`,
    },
    signal,
  })

  const rows = (unwrap(payload) ?? []).map(mapUser)

  return paginate(rows, { page, perPage })
}

/**
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {NotFoundError}
 */
export async function getUser(id) {
  try {
    const payload = await api.get(`/users/${encodeURIComponent(id)}`)
    return mapUser(unwrap(payload))
  } catch (error) {
    throw translateWriteError(error)
  }
}

/**
 * Create a team member. Requires users:manage.
 *
 * The password is sent once and never returned. `mustChangePassword` defaults
 * to true server-side, so the user is prompted to replace whatever the admin
 * chose with something only they know.
 *
 * @param {{name: string, email: string, password: string, role: string,
 *   mustChangePassword?: boolean}} input
 * @returns {Promise<object>}
 * @throws {DuplicateEmailError}
 */
export async function createUser(input) {
  try {
    const payload = await api.post('/users', {
      name: input.name?.trim(),
      email: input.email?.trim(),
      password: input.password,
      role: input.role,
      must_change_password: input.mustChangePassword ?? true,
    })
    return mapUser(unwrap(payload))
  } catch (error) {
    throw translateWriteError(error)
  }
}

/**
 * Edit name, email and role. Requires users:manage.
 *
 * Deliberately cannot change the password — that has its own endpoint, so a
 * rename can never reset someone's credentials by omission.
 *
 * @param {number|string} id
 * @param {{name: string, email: string, role: string}} input
 * @returns {Promise<object>}
 * @throws {NotFoundError|DuplicateEmailError|SafetyRuleError}
 */
export async function updateUser(id, input) {
  try {
    const payload = await api.put(`/users/${encodeURIComponent(id)}`, {
      name: input.name?.trim(),
      email: input.email?.trim(),
      role: input.role,
    })
    return mapUser(unwrap(payload))
  } catch (error) {
    // 403 here is a safety rule too — changing your own role is refused
    // because demoting yourself out of users:manage is a one-way door.
    if (error.status === 403) throw new SafetyRuleError(error.message)
    throw translateWriteError(error)
  }
}

/**
 * Activate or deactivate. Requires users:manage.
 *
 * Refused with a SafetyRuleError when deactivating yourself or the last active
 * Admin — both would leave the system with no way back in.
 *
 * @param {number|string} id
 * @param {boolean} isActive
 * @returns {Promise<object>}
 * @throws {NotFoundError|SafetyRuleError}
 */
export async function updateUserStatus(id, isActive) {
  try {
    const payload = await api.patch(`/users/${encodeURIComponent(id)}/status`, {
      is_active: isActive,
    })
    return mapUser(unwrap(payload))
  } catch (error) {
    throw translateWriteError(error)
  }
}

/**
 * Admin password reset. Requires users:manage.
 *
 * Does not ask for the current password — an admin resetting an account does
 * not have it. Returns nothing: there is nothing to say beyond "done", and
 * echoing any part of a credential is a bad habit to build.
 *
 * @param {number|string} id
 * @param {{password: string, mustChangePassword?: boolean}} input
 * @returns {Promise<void>}
 */
export async function resetUserPassword(id, input) {
  try {
    await api.patch(`/users/${encodeURIComponent(id)}/password`, {
      password: input.password,
      must_change_password: input.mustChangePassword ?? true,
    })
  } catch (error) {
    throw translateWriteError(error)
  }
}

// ── Roles and permissions ────────────────────────────────

/**
 * Roles with their user counts and current grants. Requires roles:manage.
 * @returns {Promise<Array>}
 */
export async function listRoles() {
  const payload = await api.get('/roles')
  return (unwrap(payload) ?? []).map(mapRole)
}

/**
 * The permission catalogue, already grouped for display by the server.
 * Requires roles:manage.
 *
 * @returns {Promise<Array<{group: string, permissions: Array<{key, label, description}>}>>}
 */
export async function listPermissionCatalogue() {
  const payload = await api.get('/permissions')
  return unwrap(payload) ?? []
}

/**
 * Replace a role's grants. Requires roles:manage.
 *
 * Full replacement: the role ends up holding exactly the keys sent, so an
 * empty array revokes everything. That matches how the matrix works — the
 * admin submits the state of a checkbox grid, not a changelog.
 *
 * Editing the Admin role is refused with 409.
 *
 * @param {number|string} roleId
 * @param {string[]} permissions
 * @returns {Promise<object>} The updated role.
 * @throws {NotFoundError|SafetyRuleError}
 */
export async function updateRolePermissions(roleId, permissions) {
  try {
    const payload = await api.put(`/roles/${encodeURIComponent(roleId)}/permissions`, {
      permissions,
    })
    return mapRole(unwrap(payload))
  } catch (error) {
    throw translateWriteError(error)
  }
}

/**
 * Options for a developer picker, active users only.
 * Exposed here so the issues feature does not have to know how users are
 * fetched — though it currently keeps its own copy for the same reason
 * features do not import each other's internals.
 *
 * @returns {Promise<Array<{value: string, label: string}>>}
 */
export async function listUserOptions({ role = '' } = {}) {
  const payload = await api.get('/users', { params: { role, status: 'active' } })
  return (unwrap(payload) ?? []).map((row) => ({
    value: String(row.id),
    label: row.name,
  }))
}
