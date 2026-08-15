import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { PageHeader, RouteFallback } from '@/components/common'
import { cn } from '@/lib/utils'
import { PERMISSIONS, useAuth } from '@/features/auth'

/**
 * Settings shell.
 *
 * Sub-navigation is routed rather than local tab state, so each section is
 * linkable, survives a refresh, and shows up in browser history — an admin
 * sending "here's where you change that" should be able to send a URL.
 *
 * Tabs are permission-gated, and the gate is the same one the API enforces.
 * Someone without users:view sees only Profile, and the routes behind the
 * hidden tabs guard themselves too — hiding a link is not access control.
 */
const TABS = [
  {
    to: '/settings',
    label: 'Profile',
    end: true,
    // Everyone has a profile.
    permission: null,
  },
  {
    to: '/settings/users',
    label: 'Team members',
    permission: PERMISSIONS.USERS_VIEW,
  },
  {
    to: '/settings/roles',
    label: 'Roles & permissions',
    permission: PERMISSIONS.ROLES_MANAGE,
  },
]

export function SettingsLayout() {
  const { can } = useAuth()

  const visibleTabs = TABS.filter((tab) => !tab.permission || can(tab.permission))

  return (
    <>
      <PageHeader description="Manage your profile, your team and what they can access." />

      {/* Only worth rendering when there is a choice to make. */}
      {visibleTabs.length > 1 && (
        <nav aria-label="Settings sections" className="mb-6 border-b border-line">
          <ul className="-mb-px flex gap-1 overflow-x-auto">
            {visibleTabs.map((tab) => (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-brand-600 text-brand-700'
                        : 'border-transparent text-ink-muted hover:border-line hover:text-ink',
                    )
                  }
                >
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Its own boundary, so switching tabs swaps only the panel. Falling
          through to the shell's Suspense would blank the header and tab bar
          every time a section chunk loads. */}
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </>
  )
}
