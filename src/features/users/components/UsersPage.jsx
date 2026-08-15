import { useState } from 'react'
import { Search, SearchX, TriangleAlert, UserPlus, Users, X } from 'lucide-react'
import { EmptyState } from '@/components/common'
import { Button, Input, Pagination, Select } from '@/components/ui'
import { PERMISSIONS, useAuth } from '@/features/auth'
import { toast } from '@/lib/toastStore'
import { updateUserStatus } from '../api'
import { useUsers } from '../hooks'
import { USER_ROLE_OPTIONS, USER_STATUS_OPTIONS } from '../constants'
import { UsersTable } from './UsersTable'
import { UserFormModal } from './UserFormModal'
import { ResetPasswordModal } from './ResetPasswordModal'

const ROLE_FILTER_OPTIONS = [{ value: '', label: 'All roles' }, ...USER_ROLE_OPTIONS]

/**
 * Team directory and the Create User flow.
 *
 * Rendered inside the Settings shell, so it has no PageHeader of its own —
 * SettingsLayout owns the page title and the tab bar.
 *
 * Reading requires users:view; every write requires users:manage, so someone
 * with only the former sees the directory without any action controls.
 */
export function UsersPage() {
  const {
    users,
    isLoading,
    error,
    filteredTotal,
    filters,
    sort,
    hasActiveFilters,
    setFilter,
    resetFilters,
    toggleSort,
    refresh,
    page,
    lastPage,
    perPage,
    setPage,
  } = useUsers()

  const { user: currentUser, can } = useAuth()
  const canManage = can(PERMISSIONS.USERS_MANAGE)

  // null = closed. { user: undefined } opens create; a record opens edit.
  const [formState, setFormState] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const [pendingStatusId, setPendingStatusId] = useState(null)

  const handleSaved = (user, mode) => {
    setFormState(null)
    // Refetch so the row lands in the right place under the current filters
    // and sort, rather than being spliced in where it may not belong.
    refresh()
    toast.success(mode === 'edit' ? 'Team member updated' : 'User created', {
      description:
        mode === 'edit'
          ? user.name
          : `${user.name} can now sign in as ${user.role}.`,
    })
  }

  const handlePasswordReset = (user) => {
    setResetTarget(null)
    refresh()
    toast.success('Password reset', {
      description: `Share the new password with ${user.name} securely.`,
    })
  }

  const handleToggleStatus = async (user) => {
    setPendingStatusId(user.id)
    try {
      const updated = await updateUserStatus(user.id, !user.isActive)
      refresh()
      toast.success(updated.isActive ? 'Account reactivated' : 'Account deactivated', {
        description: updated.isActive
          ? `${updated.name} can sign in again.`
          : `${updated.name} can no longer sign in. Their history is kept.`,
      })
    } catch (caught) {
      // Covers the safety rules — last active Admin, or your own account.
      toast.error('Could not change the account status', {
        description: caught.message,
      })
    } finally {
      setPendingStatusId(null)
    }
  }

  const isEmpty = !isLoading && users.length === 0

  const rangeStart = filteredTotal === 0 ? 0 : (page - 1) * perPage + 1
  const rangeEnd = Math.min(page * perPage, filteredTotal)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Team members</h2>
          <p className="text-sm text-ink-muted">
            People who can sign in. What each of them can do is set by their
            role.
          </p>
        </div>

        {canManage && (
          <Button size="sm" onClick={() => setFormState({ user: undefined })}>
            <UserPlus className="mr-1.5 size-4" aria-hidden="true" />
            Create user
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <Input
          type="search"
          value={filters.query}
          onChange={(event) => setFilter('query', event.target.value)}
          aria-label="Search team members"
          placeholder="Search name or email"
          leadingIcon={<Search className="size-4" />}
          wrapperClassName="w-full sm:w-64"
        />

        <Select
          value={filters.role}
          onChange={(event) => setFilter('role', event.target.value)}
          aria-label="Filter by role"
          options={ROLE_FILTER_OPTIONS}
          wrapperClassName="w-36"
        />

        <Select
          value={filters.status}
          onChange={(event) => setFilter('status', event.target.value)}
          aria-label="Filter by status"
          options={USER_STATUS_OPTIONS}
          wrapperClassName="w-40"
        />

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="size-4" aria-hidden="true" />
            Clear
          </Button>
        )}

        {!error && filteredTotal > 0 && (
          <p className="ml-auto text-sm whitespace-nowrap text-ink-muted">
            Showing {rangeStart}–{rangeEnd} of {filteredTotal}
          </p>
        )}
      </div>

      {error ? (
        <EmptyState
          icon={TriangleAlert}
          title="Couldn't load team members"
          description={error.message ?? 'Something went wrong fetching users.'}
          action={
            <Button size="sm" onClick={refresh}>
              Try again
            </Button>
          }
        />
      ) : isEmpty ? (
        hasActiveFilters ? (
          <EmptyState
            icon={SearchX}
            title="No matching team members"
            description="Nobody matches the current filters. Try clearing them or broadening your search."
            action={
              <Button size="sm" variant="secondary" onClick={resetFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Users}
            title="No team members yet"
            description="Create a user and they can sign in straight away."
            action={
              canManage && (
                <Button size="sm" onClick={() => setFormState({ user: undefined })}>
                  Create the first user
                </Button>
              )
            }
          />
        )
      ) : (
        <>
          <UsersTable
            users={users}
            sort={sort}
            onToggleSort={toggleSort}
            isLoading={isLoading || pendingStatusId !== null}
            canManage={canManage}
            currentUserId={currentUser?.id}
            onEdit={(user) => setFormState({ user })}
            onResetPassword={(user) => setResetTarget(user)}
            onToggleStatus={handleToggleStatus}
          />

          <Pagination
            currentPage={page}
            lastPage={lastPage}
            onPageChange={setPage}
            className="mt-4"
          />
        </>
      )}

      {/* Mounted only while open, so each open starts from the record as it
          currently stands rather than a stale draft. */}
      {formState && (
        <UserFormModal
          user={formState.user}
          onClose={() => setFormState(null)}
          onSaved={handleSaved}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onSaved={handlePasswordReset}
        />
      )}
    </>
  )
}
