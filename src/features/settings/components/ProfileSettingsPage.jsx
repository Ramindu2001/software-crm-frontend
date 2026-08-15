import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@/components/ui'
import { useAuth } from '@/features/auth'
import { USER_ROLE } from '@/features/users'

/**
 * The signed-in user's own profile.
 *
 * Read-only for now, and deliberately honest about it: the API has no
 * self-service endpoint — PUT /api/users/:id is behind users:manage, so it is
 * how an admin edits somebody, not how someone edits themselves. Rendering a
 * Save button that could only work for admins, and only by a route meant for
 * managing others, would be a worse lie than showing the fields disabled.
 *
 * What it needs to become editable is a PUT /api/auth/me (or
 * PATCH /api/users/me) scoped to the caller's own row.
 */
export function ProfileSettingsPage() {
  const { user } = useAuth()
  const role = USER_ROLE[user.role]

  return (
    <div className="grid max-w-2xl gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            How you appear on issues and comments. Contact an administrator to
            change these.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" value={user.name} readOnly disabled />
          <Input label="Email" type="email" value={user.email} readOnly disabled />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
          <CardDescription>
            Your role decides which parts of the workspace you can reach.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center gap-2">
            <Badge tone={role?.tone ?? 'neutral'}>{user.role}</Badge>
            <span className="text-sm text-ink-muted">{role?.blurb}</span>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">
              What you can do
              <span className="ml-1.5 font-normal text-ink-subtle">
                ({user.permissions.length})
              </span>
            </p>
            {/* Listed rather than summarised: "you have 11 permissions" tells
                someone nothing about why a button is missing. */}
            <ul className="flex flex-wrap gap-1.5">
              {user.permissions.map((permission) => (
                <li
                  key={permission}
                  className="rounded-md bg-sunken px-2 py-1 font-mono text-xs text-ink-muted"
                >
                  {permission}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
