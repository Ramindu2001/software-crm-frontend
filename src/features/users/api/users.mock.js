import { deriveInitials, matchesQuery, paginate, sortRows } from '@/lib/apiEnvelope'
import {
  ALL_PERMISSION_KEYS,
  MOCK_PERMISSION_CATALOGUE,
  MOCK_ROLES,
  MOCK_USERS,
} from './mockAccess'

/**
 * Mock users / access-control API.
 *
 * Matches users.http.js exactly, including the rules that are the whole point
 * of the feature and easy to lose in a mock:
 *
 *   - email uniqueness (409), excluding the row being updated
 *   - the Admin role is locked and cannot have its grants edited
 *   - you cannot deactivate yourself
 *   - you cannot deactivate or demote the last active Admin
 *   - listUsers defaults to active users only
 *
 * A mock that let an admin lock themselves out would train the UI to permit
 * something the real API refuses, and the bug would surface only in
 * production.
 *
 * No top-level function calls — the bundler can tree-shake this module when
 * the HTTP implementation is selected.
 */

const LATENCY_MS = 320

const delay = (ms = LATENCY_MS) =>
  new Promise((resolve) => setTimeout(resolve, ms))

export class NotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NotFoundError'
    this.status = 404
  }
}

export class DuplicateEmailError extends Error {
  constructor(message) {
    super(message)
    this.name = 'DuplicateEmailError'
    this.status = 409
    this.field = 'email'
  }
}

export class SafetyRuleError extends Error {
  constructor(message) {
    super(message)
    this.name = 'SafetyRuleError'
    this.status = 409
  }
}

// Mutable stores standing in for the database.
let userStore = null
let roleStore = null

function getUsers() {
  userStore ??= MOCK_USERS.map((user) => ({ ...user }))
  return userStore
}

function getRoles() {
  roleStore ??= MOCK_ROLES.map((role) => ({
    ...role,
    permissions: [...role.permissions],
  }))
  return roleStore
}

/**
 * The signed-in user, for the self-deactivation guard.
 *
 * The real API reads this from the bearer token. The mock has no request
 * context, so it reads the session the auth mock wrote — which is the same
 * information arriving by a different route.
 */
function currentUserId() {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const raw = storage.getItem('synnex:session')
      if (raw) return JSON.parse(raw)?.user?.id ?? null
    } catch {
      // Storage unavailable or corrupt — fall through to the next one.
    }
  }
  return null
}

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

function mapRole(role) {
  const users = getUsers().filter((user) => user.role === role.name)
  return {
    id: role.id,
    name: role.name,
    usersCount: users.length,
    activeUsersCount: users.filter((user) => user.is_active).length,
    isLocked: role.isLocked,
    permissions: [...role.permissions],
  }
}

/** @throws {DuplicateEmailError} */
function assertEmailAvailable(email, excludeId) {
  const needle = String(email).trim().toLowerCase()
  const clash = getUsers().find(
    (user) => user.email.toLowerCase() === needle && user.id !== excludeId,
  )

  if (clash) {
    throw new DuplicateEmailError(
      `Another user (id ${clash.id}, ${clash.name}) already uses the email ${needle}`,
    )
  }
}

/** @throws {SafetyRuleError} */
function assertNotLastActiveAdmin(userId, action) {
  const user = getUsers().find((candidate) => candidate.id === userId)
  if (!user || user.role !== 'Admin' || !user.is_active) return

  const activeAdmins = getUsers().filter(
    (candidate) => candidate.role === 'Admin' && candidate.is_active,
  ).length

  if (activeAdmins <= 1) {
    throw new SafetyRuleError(
      `Cannot ${action} the last active Admin — promote another user to Admin first`,
    )
  }
}

const SORT_ACCESSORS = {
  id: (user) => user.id,
  name: (user) => user.name.toLowerCase(),
  email: (user) => user.email.toLowerCase(),
  role: (user) => user.role,
  createdAt: (user) => new Date(user.createdAt).getTime(),
}

const SEARCH_FIELDS = ['name', 'email']

// ── Users ────────────────────────────────────────────────

export async function listUsers({
  query = '',
  role = '',
  status = 'all',
  sortBy = 'name',
  sortDir = 'asc',
  page = 1,
  perPage = 10,
} = {}) {
  await delay()

  const rows = getUsers()
    .map(mapUser)
    .filter((user) => {
      if (role && user.role !== role) return false
      if (status === 'active' && !user.isActive) return false
      if (status === 'inactive' && user.isActive) return false
      return matchesQuery(user, query, SEARCH_FIELDS)
    })

  const accessor = SORT_ACCESSORS[sortBy] ?? SORT_ACCESSORS.name

  return paginate(sortRows(rows, accessor, sortDir), { page, perPage })
}

export async function getUser(id) {
  await delay(200)

  const user = getUsers().find((candidate) => String(candidate.id) === String(id))
  if (!user) throw new NotFoundError(`User ${id} was not found.`)

  return mapUser(user)
}

export async function createUser(input) {
  await delay(450)

  assertEmailAvailable(input.email)

  const user = {
    id: getUsers().reduce((max, candidate) => Math.max(max, candidate.id), 0) + 1,
    name: input.name?.trim(),
    email: input.email?.trim().toLowerCase(),
    role: input.role,
    is_active: true,
    must_change_password: input.mustChangePassword ?? true,
    created_at: new Date().toISOString(),
  }

  // The password is deliberately not stored — see the note in mockAccess.js.
  userStore = [...getUsers(), user]
  return mapUser(user)
}

export async function updateUser(id, input) {
  await delay(400)

  const numericId = Number(id)
  const index = getUsers().findIndex((candidate) => candidate.id === numericId)
  if (index === -1) throw new NotFoundError(`User ${id} was not found.`)

  const existing = getUsers()[index]
  const isRoleChange = existing.role !== input.role

  if (isRoleChange && numericId === currentUserId()) {
    throw new SafetyRuleError(
      'You cannot change your own role — ask another Admin to do it',
    )
  }
  if (isRoleChange) assertNotLastActiveAdmin(numericId, 'demote')

  assertEmailAvailable(input.email, numericId)

  const updated = {
    ...existing,
    name: input.name?.trim(),
    email: input.email?.trim().toLowerCase(),
    role: input.role,
  }

  userStore = getUsers().map((user, position) => (position === index ? updated : user))
  return mapUser(updated)
}

export async function updateUserStatus(id, isActive) {
  await delay(300)

  const numericId = Number(id)
  const index = getUsers().findIndex((candidate) => candidate.id === numericId)
  if (index === -1) throw new NotFoundError(`User ${id} was not found.`)

  if (!isActive) {
    if (numericId === currentUserId()) {
      throw new SafetyRuleError('You cannot deactivate your own account')
    }
    assertNotLastActiveAdmin(numericId, 'deactivate')
  }

  const updated = { ...getUsers()[index], is_active: isActive }
  userStore = getUsers().map((user, position) => (position === index ? updated : user))

  return mapUser(updated)
}

export async function resetUserPassword(id, input) {
  await delay(400)

  const numericId = Number(id)
  const index = getUsers().findIndex((candidate) => candidate.id === numericId)
  if (index === -1) throw new NotFoundError(`User ${id} was not found.`)

  const updated = {
    ...getUsers()[index],
    must_change_password: input.mustChangePassword ?? true,
  }
  userStore = getUsers().map((user, position) => (position === index ? updated : user))

  // Returns nothing, matching the API.
}

// ── Roles and permissions ────────────────────────────────

export async function listRoles() {
  await delay(250)
  return getRoles().map(mapRole)
}

export async function listPermissionCatalogue() {
  await delay(200)
  // Deep-copied so a component cannot mutate the catalogue by accident.
  return MOCK_PERMISSION_CATALOGUE.map((group) => ({
    group: group.group,
    permissions: group.permissions.map((permission) => ({ ...permission })),
  }))
}

export async function updateRolePermissions(roleId, permissions) {
  await delay(450)

  const numericId = Number(roleId)
  const index = getRoles().findIndex((role) => role.id === numericId)
  if (index === -1) throw new NotFoundError(`Role ${roleId} was not found.`)

  const role = getRoles()[index]

  if (role.isLocked) {
    throw new SafetyRuleError(
      `The ${role.name} role always holds every permission and cannot be edited — ` +
        'this is what guarantees there is always a way back into administration',
    )
  }

  const unknown = permissions.filter((key) => !ALL_PERMISSION_KEYS.includes(key))
  if (unknown.length) {
    const error = new Error('Validation failed')
    error.status = 422
    error.messages = unknown.map(
      (key) => `permissions: "${key}" is not a known permission`,
    )
    throw error
  }

  // Full replacement, and deduplicated — the same as the API.
  const updated = { ...role, permissions: [...new Set(permissions)] }
  roleStore = getRoles().map((entry, position) =>
    position === index ? updated : entry,
  )

  return mapRole(updated)
}

export async function listUserOptions({ role = '' } = {}) {
  await delay(150)
  return getUsers()
    .filter((user) => user.is_active && (!role || user.role === role))
    .map((user) => ({ value: String(user.id), label: user.name }))
}
