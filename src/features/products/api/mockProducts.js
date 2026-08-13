export const MOCK_PRODUCTS = [
  {
    id: 'PRD-1001',
    name: 'Synnex ERP Enterprise',
    type: 'Software',
    is_active: true,
    basic_requirements: [
      '8GB RAM minimum',
      'Quad-core processor',
      '100GB SSD storage'
    ],
    software_requirements: [
      'Windows Server 2019 or later',
      'SQL Server 2019'
    ],
    packages: [
      {
        id: 'PKG-1',
        name: 'Basic Edition',
        first_year_price: 1500,
        second_year_price: 1000,
        monthly_price: 150,
        features: ['Core ERP Modules', 'Up to 5 Users', 'Standard Support']
      },
      {
        id: 'PKG-2',
        name: 'Professional Edition',
        first_year_price: 3000,
        second_year_price: 2000,
        monthly_price: 250,
        features: ['Core ERP + Advanced Reporting', 'Up to 20 Users', '24/7 Priority Support']
      }
    ],
    createdAt: '2025-01-10T10:00:00.000Z',
    updatedAt: '2025-01-15T12:00:00.000Z'
  },
  {
    id: 'PRD-1002',
    name: 'Cloud Infrastructure Setup',
    type: 'Service',
    is_active: true,
    basic_requirements: [
      'Active AWS/Azure Account',
      'Domain Name'
    ],
    software_requirements: [],
    packages: [
      {
        id: 'PKG-3',
        name: 'Standard Migration',
        first_year_price: 5000,
        second_year_price: 0,
        monthly_price: 0,
        features: ['Lift and Shift Migration', 'Basic Security Setup', '1 Month Monitoring']
      }
    ],
    createdAt: '2025-02-20T09:30:00.000Z',
    updatedAt: '2025-02-21T14:15:00.000Z'
  },
  {
    id: 'PRD-1003',
    name: 'Legacy CRM System',
    type: 'Software',
    is_active: false,
    basic_requirements: [
      '4GB RAM',
      'Dual-core processor'
    ],
    software_requirements: [
      'Windows 10'
    ],
    packages: [
      {
        id: 'PKG-4',
        name: 'Legacy License',
        first_year_price: 800,
        second_year_price: 400,
        monthly_price: 50,
        features: ['Contact Management', 'Basic Emailing']
      }
    ],
    createdAt: '2023-05-12T08:00:00.000Z',
    updatedAt: '2024-11-01T10:00:00.000Z'
  }
]
