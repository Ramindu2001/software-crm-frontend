/**
 * Seed data for the mock products API.
 *
 * Mirrors what `npm run seed` puts in the real database, and uses the same
 * shape products.http.js maps to: numeric ids (the API has no PRD- reference),
 * plain-string requirements and features, and short package field names.
 */

export const MOCK_PRODUCTS = [
  {
    id: 1,
    name: 'POS System',
    description: 'Complete Restaurant Management',
    type: 'Software',
    is_active: true,
    basic_requirements: ['Company Logo', 'Menu Excel Sheet'],
    software_requirements: ['Windows 10', '8GB RAM'],
    packages: [
      {
        id: 1,
        name: 'Basic',
        first_year_price: 50000,
        second_year_price: 40000,
        monthly_price: 5000,
        features: ['DINE-IN', 'TAKEAWAY', 'BILLING'],
      },
      {
        id: 2,
        name: 'Premium',
        first_year_price: 90000,
        second_year_price: 75000,
        monthly_price: 9000,
        features: ['DINE-IN', 'TAKEAWAY', 'DELIVERY', 'BILLING', 'ANALYTICS'],
      },
    ],
  },
  {
    id: 2,
    name: 'Annual Support Retainer',
    description: 'On-site and remote support, 8x5',
    type: 'Service',
    is_active: true,
    basic_requirements: ['Signed SLA', 'Named technical contact'],
    software_requirements: [],
    packages: [
      {
        id: 3,
        name: 'Standard',
        first_year_price: 120000,
        second_year_price: 120000,
        monthly_price: 12000,
        features: ['8x5 Remote Support', '4h Response', 'Quarterly Review'],
      },
    ],
  },
  {
    id: 3,
    name: 'Synnex ERP Enterprise',
    description: 'Finance, inventory and HR in one suite',
    type: 'Software',
    is_active: true,
    basic_requirements: [
      'Quad-core processor',
      '8GB RAM minimum',
      '100GB SSD storage',
    ],
    software_requirements: ['Windows Server 2019 or later', 'SQL Server 2019'],
    packages: [
      {
        id: 4,
        name: 'Business',
        first_year_price: 300000,
        second_year_price: 200000,
        monthly_price: 25000,
        features: ['Core ERP Modules', 'Up to 20 Users', 'Standard Support'],
      },
      {
        id: 5,
        name: 'Enterprise',
        first_year_price: 550000,
        second_year_price: 400000,
        monthly_price: 46000,
        features: [
          'All Business features',
          'Unlimited Users',
          'Advanced Reporting',
          '24/7 Priority Support',
        ],
      },
    ],
  },
  {
    id: 4,
    name: 'Legacy CRM System',
    description: 'Superseded by Synnex ERP Enterprise',
    type: 'Software',
    // Retired rather than deleted: the API has no DELETE, because a product
    // referenced by a quotation or subscription cannot be removed.
    is_active: false,
    basic_requirements: ['Dual-core processor', '4GB RAM'],
    software_requirements: ['Windows 10'],
    packages: [
      {
        id: 6,
        name: 'Legacy License',
        first_year_price: 80000,
        second_year_price: 40000,
        monthly_price: 5000,
        features: ['Contact Management', 'Basic Emailing'],
      },
    ],
  },
]
