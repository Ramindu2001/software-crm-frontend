import { Info, TriangleAlert } from 'lucide-react'
import { ApiErrorAlert, EmptyState, RouteFallback } from '@/components/common'
import { Button } from '@/components/ui'
import { PERMISSIONS, useAuth } from '@/features/auth'
import { toast } from '@/lib/toastStore'
import { useRolePermissions } from '../hooks'
import { USER_ROLE } from '../constants'
import { PermissionMatrix } from './PermissionMatrix'

/**
 * Roles & permissions.
 *
 * Rendered inside the Settings shell, so it has no PageHeader of its own.
 *
 * The whole screen is behind roles:manage, including the read. A matrix that
 * spells out exactly what each role can do is reconnaissance for anyone who
 * should not be editing it, so the API gates the GET too.
 */
export function RolesPage() {
  const { can } = useAuth()
  const canManage = can(PERMISSIONS.ROLES_MANAGE)

  const {
    catalogue,
    roles,
    isLoading,
    error,
    saveError,
    savingRoleId,
    dirtyRoleIds,
    isDirty,
    holds,
    toggle,
    toggleGroup,
    save,
    discard,
    refresh,
  } = useRolePermissions()

  const handleSave = async (roleId) => {
    const role = roles.find((candidate) => candidate.id === roleId)
    try {
      const saved = await save(roleId)
      toast.success(`${saved.name} permissions updated`, {
        description:
          saved.usersCount === 0
            ? 'No users currently hold this role.'
            : `Applies to ${saved.usersCount} ${saved.usersCount === 1 ? 'user' : 'users'} on their next request.`,
      })
    } catch {
      // Rendered inline by the alert below — a toast on top would be noise,
      // and the banner sits next to the grid the admin is looking at.
      toast.error(`Could not update ${role?.name ?? 'role'} permissions`)
    }
  }

  // RouteFallback, not FullPageLoader: this renders inside the Settings shell,
  // and a min-h-screen loader would push the tab bar off the top.
  if (isLoading) return <RouteFallback />

  if (error) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn't load permissions"
        description={error.message ?? 'Something went wrong fetching the permission matrix.'}
        action={
          <Button size="sm" onClick={refresh}>
            Try again
          </Button>
        }
      />
    )
  }

  return (
    <>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-ink">Roles &amp; permissions</h2>
        <p className="text-sm text-ink-muted">
          Control which features each role can reach. Changes apply to everyone
          holding that role.
        </p>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {roles.map((role) => (
          <div
            key={role.id}
            className="rounded-lg border border-line bg-surface px-3 py-2.5"
          >
            <p className="text-sm font-medium text-ink">{role.name}</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {USER_ROLE[role.name]?.blurb}
            </p>
          </div>
        ))}
      </div>

      {/* Explains the locked column before the admin discovers it by clicking
          a disabled checkbox and wondering why nothing happened. */}
      <div className="mb-4 flex gap-2.5 rounded-lg border border-line bg-sunken px-3 py-2.5">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
        <p className="text-sm text-ink-muted">
          The <span className="font-medium text-ink">Admin</span> role always
          holds every permission and cannot be edited. Managing permissions is
          itself a permission — if it could be removed from Admin, nobody could
          ever grant it back.
        </p>
      </div>

      {saveError && (
        <div className="mb-4">
          <ApiErrorAlert error={saveError} fallback="Could not save the permissions." />
        </div>
      )}

      <PermissionMatrix
        catalogue={catalogue}
        roles={roles}
        holds={holds}
        onToggle={toggle}
        onToggleGroup={toggleGroup}
        dirtyRoleIds={dirtyRoleIds}
        savingRoleId={savingRoleId}
        onSave={handleSave}
        onDiscard={discard}
        readOnly={!canManage}
      />

      {isDirty && canManage && (
        <p className="mt-3 text-sm text-ink-muted" role="status">
          You have unsaved changes. Each role is saved from its own column
          header.
        </p>
      )}
    </>
  )
}
