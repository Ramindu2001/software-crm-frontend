import {
  LayoutDashboard,
  CircleDot,
  Users,
  UserPlus,
  FileText,
  BarChart3,
  Settings,
  Package,
} from 'lucide-react'

/**
 * Sidebar navigation.
 *
 * Kept as data so adding a section is a one-line change rather than an edit
 * inside JSX.
 *
 * `permission` gates the item against the signed-in user's grants, so nobody
 * is shown a link to a page that would only tell them off. It is presentation
 * only — the route behind each link guards itself with RequirePermission, and
 * the API re-checks after that. Hiding a link is not access control.
 *
 * Items with no `permission` are always visible: Settings, because everyone
 * has a profile, and Reports, which has no API behind it yet.
 */
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
  { to: '/issues', label: 'Issues', icon: CircleDot, permission: 'issues:view' },
  // Ordered before Customers because that is the order of the process: an
  // enquiry is a lead first, and becomes a customer only once it is won.
  { to: '/leads', label: 'Leads', icon: UserPlus, permission: 'leads:view' },
  { to: '/customers', label: 'Customers', icon: Users, permission: 'customers:view' },
  { to: '/quotations', label: 'Quotations', icon: FileText, permission: 'quotations:view' },
  { to: '/products', label: 'Products', icon: Package, permission: 'products:view' },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]
