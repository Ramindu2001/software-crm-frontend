import { ArrowDown, ArrowUp, ChevronsUpDown, KeyRound, Pencil, Power, PowerOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { Avatar, Badge, Card } from '@/components/ui'
import { USER_ROLE } from '../constants'

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'role', label: 'Role', width: 'w-36' },
  { key: 'status', label: 'Status', width: 'w-32', sortable: false },
  {
    key: 'createdAt',
    label: 'Added',
    width: 'w-32',
    responsive: 'hidden lg:table-cell',
  },
]

const ARIA_SORT = { asc: 'ascending', desc: 'descending' }

function SortIcon({ isActive, direction }) {
  if (!isActive) {
    return (
      <ChevronsUpDown
        className="size-3.5 text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
    )
  }

  const Icon = direction === 'asc' ? ArrowUp : ArrowDown
  return <Icon className="size-3.5 text-brand-600" aria-hidden="true" />
}

function SkeletonRows({ rows = 5, columnCount }) {
  return Array.from({ length: rows }, (_, index) => (
    <tr key={index} className="animate-pulse">
      {Array.from({ length: columnCount }, (_, cell) => (
        <td key={cell} className="px-4 py-3.5">
          <div className="h-3 rounded bg-line" />
        </td>
      ))}
    </tr>
  ))
}

/** Icon-only action with an accessible name that names the person. */
function RowAction({ icon: Icon, label, onClick, disabled, tone = 'default' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        tone === 'danger'
          ? 'text-ink-muted hover:bg-danger-soft hover:text-danger-strong'
          : 'text-ink-muted hover:bg-surface hover:text-brand-700',
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}

function UserRow({ user, canManage, isSelf, onEdit, onResetPassword, onToggleStatus }) {
  const role = USER_ROLE[user.role]

  return (
    <tr
      className={cn(
        'transition-colors hover:bg-sunken',
        // Deactivated rows are dimmed rather than hidden — an admin needs to
        // find them to reactivate them.
        !user.isActive && 'opacity-60',
      )}
    >
      <td className="px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar initials={user.initials} size="sm" />
          <div className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium text-ink">
                {user.name}
              </span>
              {isSelf && (
                <span className="shrink-0 text-xs text-ink-subtle">(you)</span>
              )}
            </span>
            <span className="block truncate text-xs text-ink-subtle">
              {user.email}
            </span>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <Badge tone={role?.tone ?? 'neutral'} size="sm">
          {role?.label ?? user.role}
        </Badge>
      </td>

      <td className="px-4 py-3">
        {user.isActive ? (
          <div className="flex flex-col gap-1">
            <Badge tone="success" size="sm" dot>
              Active
            </Badge>
            {/* Surfaced because it tells an admin the account is not fully
                set up yet — the person still has an admin-chosen password. */}
            {user.mustChangePassword && (
              <span className="text-xs text-ink-subtle">Password reset pending</span>
            )}
          </div>
        ) : (
          <Badge tone="neutral" size="sm" dot>
            Deactivated
          </Badge>
        )}
      </td>

      <td className="hidden px-4 py-3 lg:table-cell">
        <time
          dateTime={user.createdAt}
          className="text-sm whitespace-nowrap text-ink-muted"
        >
          {formatDate(user.createdAt)}
        </time>
      </td>

      {canManage && (
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-0.5">
            <RowAction
              icon={Pencil}
              label={`Edit ${user.name}`}
              onClick={() => onEdit(user)}
            />
            <RowAction
              icon={KeyRound}
              label={`Reset password for ${user.name}`}
              onClick={() => onResetPassword(user)}
            />
            <RowAction
              icon={user.isActive ? PowerOff : Power}
              tone={user.isActive ? 'danger' : 'default'}
              label={
                isSelf
                  ? 'You cannot deactivate your own account'
                  : `${user.isActive ? 'Deactivate' : 'Reactivate'} ${user.name}`
              }
              // The API refuses this with a 409; disabling it here means the
              // admin never has to discover that by being told off.
              disabled={isSelf && user.isActive}
              onClick={() => onToggleStatus(user)}
            />
          </div>
        </td>
      )}
    </tr>
  )
}

/**
 * The team directory.
 *
 * @param {object} props
 * @param {Array} props.users
 * @param {{by: string, dir: 'asc'|'desc'}} props.sort
 * @param {(field: string) => void} props.onToggleSort
 * @param {boolean} [props.isLoading]
 * @param {boolean} [props.canManage] Renders the row actions.
 * @param {number|null} [props.currentUserId] Marks "(you)" and blocks
 *   self-deactivation.
 */
export function UsersTable({
  users,
  sort,
  onToggleSort,
  isLoading = false,
  canManage = false,
  currentUserId = null,
  onEdit,
  onResetPassword,
  onToggleStatus,
}) {
  const showSkeleton = isLoading && users.length === 0
  const columnCount = COLUMNS.length + (canManage ? 1 : 0)

  return (
    <Card className="overflow-hidden">
      <div className="max-h-[32rem] overflow-auto">
        <table
          className="w-full min-w-2xl table-fixed border-collapse"
          aria-busy={isLoading || undefined}
        >
          <caption className="sr-only">
            Team members, sortable by column.
          </caption>

          <thead className="sticky top-0 z-10">
            <tr className="border-b border-line bg-sunken">
              {COLUMNS.map((column) => {
                const isSortable = column.sortable !== false
                const isActive = isSortable && sort.by === column.key
                const label = (
                  <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                    {column.label}
                  </span>
                )

                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      isSortable ? (isActive ? ARIA_SORT[sort.dir] : 'none') : undefined
                    }
                    className={cn(
                      'px-4 py-2.5 text-left',
                      column.width,
                      column.responsive,
                    )}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => onToggleSort(column.key)}
                        className="group inline-flex items-center gap-1.5 transition-colors hover:[&>span]:text-ink"
                      >
                        {label}
                        <SortIcon isActive={isActive} direction={sort.dir} />
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                )
              })}

              {canManage && (
                <th scope="col" className="w-32 px-4 py-2.5 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>

          <tbody
            className={cn(
              'divide-y divide-line transition-opacity',
              isLoading && !showSkeleton && 'pointer-events-none opacity-60',
            )}
          >
            {showSkeleton ? (
              <SkeletonRows columnCount={columnCount} />
            ) : (
              users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  canManage={canManage}
                  isSelf={Number(user.id) === Number(currentUserId)}
                  onEdit={onEdit}
                  onResetPassword={onResetPassword}
                  onToggleStatus={onToggleStatus}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
