import {
  LayoutDashboard,
  CircleDot,
  Users,
  FileText,
  BarChart3,
  Settings,
} from 'lucide-react'

/**
 * Sidebar navigation.
 *
 * Kept as data so adding a section is a one-line change rather than an edit
 * inside JSX. `badge` is static placeholder wiring for now — it will be fed
 * by real counts once the issues feature has a data layer.
 */
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/issues', label: 'Issues', icon: CircleDot, badge: 12 },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/quotations', label: 'Quotations', icon: FileText },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]
