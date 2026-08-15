import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge, Button, Card } from '@/components/ui'
import { USER_ROLE } from '../constants'

/**
 * The Role × Permission grid.
 *
 * Rows are permissions grouped by feature; columns are roles. Reading across a
 * row answers "who can do this", reading down a column answers "what can this
 * role do" — both are questions an admin actually asks, which is why a grid
 * beats three separate per-role checklists.
 *
 * Each column saves independently. The API replaces grants one role at a time
 * (PUT /api/roles/:id/permissions), and a single Save All across three roles
 * could half-fail and leave the matrix in a state nobody chose.
 *
 * The Admin column is locked. `roles:manage` is itself a permission, so an
 * admin who unticked it would remove the only route back into administration.
 * Rendering it as visibly locked is kinder than letting someone try and catch
 * a 409.
 */

/** A group's tri-state for one role: all, none, or some. */
function groupState(permissions, roleId, holds) {
  const held = permissions.filter((permission) => holds(roleId, permission.key)).length
  if (held === 0) return 'none'
  if (held === permissions.length) return 'all'
  return 'some'
}

function PermissionCheckbox({ checked, indeterminate, disabled, onChange, label }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={label}
      // The native indeterminate state is a DOM property, not an attribute, so
      // it can only be set through a ref callback.
      ref={(node) => {
        if (node) node.indeterminate = Boolean(indeterminate)
      }}
      className={cn(
        'size-4 cursor-pointer rounded accent-brand-600',
        'disabled:cursor-not-allowed disabled:opacity-40',
      )}
    />
  )
}

function RoleColumnHeader({ role, isDirty, isSaving, onSave, onDiscard }) {
  const meta = USER_ROLE[role.name]

  return (
    <th scope="col" className="w-40 px-3 py-3 align-top">
      <div className="flex flex-col items-center gap-1.5">
        <span className="flex items-center gap-1.5">
          <Badge tone={meta?.tone ?? 'neutral'} size="sm">
            {role.name}
          </Badge>
          {role.isLocked && (
            <Lock
              className="size-3.5 text-ink-subtle"
              aria-label="Locked — always holds every permission"
            />
          )}
        </span>

        <span className="text-xs font-normal text-ink-subtle">
          {role.usersCount} {role.usersCount === 1 ? 'user' : 'users'}
          {role.activeUsersCount !== role.usersCount &&
            ` · ${role.activeUsersCount} active`}
        </span>

        {/* Save controls live in the column header, next to the thing they
            act on, so a wide grid never separates a change from its Save. */}
        {isDirty && !role.isLocked && (
          <span className="mt-1 flex flex-col items-center gap-1">
            <Button size="sm" onClick={() => onSave(role.id)} isLoading={isSaving}>
              Save
            </Button>
            <button
              type="button"
              onClick={onDiscard}
              disabled={isSaving}
              className="text-xs font-normal text-ink-muted underline-offset-2 transition-colors hover:text-ink hover:underline disabled:opacity-50"
            >
              Discard
            </button>
          </span>
        )}
      </div>
    </th>
  )
}

/**
 * @param {object} props
 * @param {Array<{group: string, permissions: Array}>} props.catalogue
 * @param {Array} props.roles
 * @param {(roleId: number, key: string) => boolean} props.holds
 * @param {(roleId: number, key: string) => void} props.onToggle
 * @param {(roleId: number, keys: string[], shouldHold: boolean) => void} props.onToggleGroup
 * @param {Set<number>} props.dirtyRoleIds
 * @param {number|null} props.savingRoleId
 * @param {(roleId: number) => void} props.onSave
 * @param {() => void} props.onDiscard
 * @param {boolean} [props.readOnly] Renders the grid without any controls.
 */
export function PermissionMatrix({
  catalogue,
  roles,
  holds,
  onToggle,
  onToggleGroup,
  dirtyRoleIds,
  savingRoleId,
  onSave,
  onDiscard,
  readOnly = false,
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-2xl border-collapse">
          <caption className="sr-only">
            Permissions by role. Each column can be saved independently.
          </caption>

          <thead>
            <tr className="border-b border-line bg-sunken">
              <th scope="col" className="px-4 py-3 text-left">
                <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                  Permission
                </span>
              </th>

              {roles.map((role) => (
                <RoleColumnHeader
                  key={role.id}
                  role={role}
                  isDirty={!readOnly && dirtyRoleIds.has(role.id)}
                  isSaving={savingRoleId === role.id}
                  onSave={onSave}
                  onDiscard={onDiscard}
                />
              ))}
            </tr>
          </thead>

          {catalogue.map((group) => {
            const keys = group.permissions.map((permission) => permission.key)

            return (
              <tbody key={group.group} className="divide-y divide-line">
                {/* Group header doubles as a bulk toggle — ticking a whole
                    feature area is the common case. */}
                <tr className="bg-sunken/60">
                  <th scope="colgroup" className="px-4 py-2 text-left">
                    <span className="text-xs font-semibold tracking-wide text-ink uppercase">
                      {group.group}
                    </span>
                  </th>

                  {roles.map((role) => {
                    const state = groupState(group.permissions, role.id, holds)
                    const disabled = readOnly || role.isLocked

                    return (
                      <td key={role.id} className="px-3 py-2 text-center">
                        <PermissionCheckbox
                          checked={state === 'all'}
                          indeterminate={state === 'some'}
                          disabled={disabled}
                          onChange={() =>
                            onToggleGroup(role.id, keys, state !== 'all')
                          }
                          label={`${state === 'all' ? 'Remove' : 'Grant'} all ${group.group} permissions for ${role.name}`}
                        />
                      </td>
                    )
                  })}
                </tr>

                {group.permissions.map((permission) => (
                  <tr key={permission.key} className="transition-colors hover:bg-sunken">
                    <td className="px-4 py-2.5">
                      <span className="block text-sm text-ink">{permission.label}</span>
                      {permission.description && (
                        <span className="block text-xs text-ink-subtle">
                          {permission.description}
                        </span>
                      )}
                    </td>

                    {roles.map((role) => (
                      <td key={role.id} className="px-3 py-2.5 text-center">
                        <PermissionCheckbox
                          checked={holds(role.id, permission.key)}
                          disabled={readOnly || role.isLocked}
                          onChange={() => onToggle(role.id, permission.key)}
                          label={`${permission.label} for ${role.name}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )
          })}
        </table>
      </div>
    </Card>
  )
}
