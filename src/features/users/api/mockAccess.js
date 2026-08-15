/**
 * Seed data for the mock users / access-control API.
 *
 * The permission catalogue mirrors `utils/permissions.js` on the backend, and
 * the role grants mirror what `npm run migrate` seeds. Keeping them in step is
 * what lets the whole feature be developed with the flag on "mock" and then
 * flipped without a single component changing.
 *
 * Passwords are absent on purpose. The mock never stores one — creating a user
 * here only records that a password was set, because a mock that kept
 * credentials in a module would be a habit worth not forming.
 */

export const MOCK_PERMISSION_CATALOGUE = [
  {
    group: 'Dashboard',
    permissions: [
      {
        key: 'dashboard:view',
        label: 'View dashboard',
        description: 'See the headline counters and recent issues.',
      },
    ],
  },
  {
    group: 'Issues',
    permissions: [
      {
        key: 'issues:view',
        label: 'View issues',
        description: 'Browse the issue queue and open individual issues.',
      },
      {
        key: 'issues:create',
        label: 'Raise issues',
        description: 'Log a new issue against a customer and product.',
      },
      {
        key: 'issues:setStatus',
        label: 'Change issue status',
        description: 'Move an issue through Open, In Progress, QA and Resolved.',
      },
    ],
  },
  {
    group: 'Customers',
    permissions: [
      {
        key: 'customers:view',
        label: 'View customers',
        description: 'See the customer directory and customer pickers.',
      },
      {
        key: 'customers:write',
        label: 'Add and edit customers',
        description: 'Create customer records and update their details.',
      },
    ],
  },
  {
    group: 'Products',
    permissions: [
      {
        key: 'products:view',
        label: 'View product catalogue',
        description: 'See products, packages and pricing.',
      },
      {
        key: 'products:write',
        label: 'Manage product catalogue',
        description: 'Create and edit products, packages and their pricing.',
      },
    ],
  },
  {
    group: 'Quotations',
    permissions: [
      {
        key: 'quotations:view',
        label: 'View quotations',
        description: 'See quotations and their totals.',
      },
      {
        key: 'quotations:create',
        label: 'Create quotations',
        description: 'Price line items and generate a quotation.',
      },
      {
        key: 'quotations:setStatus',
        label: 'Approve or reject quotations',
        description: 'Move a quotation between Pending, Approved and Rejected.',
      },
    ],
  },
  {
    group: 'Administration',
    permissions: [
      {
        key: 'users:view',
        label: 'View team members',
        description: 'See the user list and the developer assignment picker.',
      },
      {
        key: 'users:manage',
        label: 'Manage users',
        description: 'Create users, edit them, reset passwords and deactivate accounts.',
      },
      {
        key: 'roles:manage',
        label: 'Manage role permissions',
        description: 'Change which features each role can access.',
      },
    ],
  },
]

/** Every key in the catalogue, flattened — Admin holds all of them. */
export const ALL_PERMISSION_KEYS = MOCK_PERMISSION_CATALOGUE.flatMap((group) =>
  group.permissions.map((permission) => permission.key),
)

export const MOCK_ROLES = [
  {
    id: 1,
    name: 'Admin',
    // Locked for the same reason the server locks it: roles:manage is itself
    // a permission, so unticking it would remove the only route back.
    isLocked: true,
    permissions: [...ALL_PERMISSION_KEYS],
  },
  {
    id: 2,
    name: 'Support',
    isLocked: false,
    permissions: [
      'dashboard:view',
      'issues:view',
      'issues:create',
      'issues:setStatus',
      'customers:view',
      'customers:write',
      'products:view',
      'quotations:view',
      'quotations:create',
      'quotations:setStatus',
      'users:view',
    ],
  },
  {
    id: 3,
    name: 'Developer',
    isLocked: false,
    permissions: [
      'dashboard:view',
      'issues:view',
      'issues:setStatus',
      'customers:view',
      'products:view',
      'quotations:view',
      'users:view',
    ],
  },
]

export const MOCK_USERS = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@synnexit.com',
    role: 'Admin',
    is_active: true,
    must_change_password: false,
    created_at: '2026-01-08T09:00:00Z',
  },
  {
    id: 2,
    name: 'Support User',
    email: 'support@synnexit.com',
    role: 'Support',
    is_active: true,
    must_change_password: false,
    created_at: '2026-01-08T09:00:00Z',
  },
  {
    id: 3,
    name: 'Developer User',
    email: 'dev@synnexit.com',
    role: 'Developer',
    is_active: true,
    must_change_password: false,
    created_at: '2026-01-08T09:00:00Z',
  },
  {
    id: 4,
    name: 'Nadia Perera',
    email: 'nadia@synnexit.com',
    role: 'Developer',
    is_active: true,
    must_change_password: true,
    created_at: '2026-03-02T11:20:00Z',
  },
  {
    id: 5,
    name: 'Dilan Silva',
    email: 'dilan@synnexit.com',
    role: 'Developer',
    is_active: true,
    must_change_password: false,
    created_at: '2026-04-19T08:45:00Z',
  },
  {
    id: 6,
    name: 'Amara Jayawardena',
    email: 'amara@synnexit.com',
    role: 'Support',
    is_active: true,
    must_change_password: false,
    created_at: '2026-05-27T14:10:00Z',
  },
  {
    id: 7,
    name: 'Kasun Fernando',
    email: 'kasun@synnexit.com',
    role: 'Developer',
    // Deactivated rather than deleted — his ticket comments still name him.
    is_active: false,
    must_change_password: false,
    created_at: '2025-11-14T10:05:00Z',
  },
]
