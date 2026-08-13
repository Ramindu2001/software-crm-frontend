/**
 * Seed data for Quotations standing in for the Laravel backend.
 */

export const MOCK_QUOTATIONS = [
  {
    id: 1,
    customerId: 1, // Acme Corp
    status: 'approved',
    date: '2026-08-01T09:00:00Z',
    items: [
      { id: '1-1', productName: 'Enterprise License', quantity: 1, unitPrice: 5000, amount: 5000 },
      { id: '1-2', productName: 'Onboarding Support', quantity: 10, unitPrice: 150, amount: 1500 },
    ],
    totalAmount: 6500,
    createdAt: '2026-08-01T09:00:00Z',
    updatedAt: '2026-08-03T11:20:00Z',
  },
  {
    id: 2,
    customerId: 2, // Northwind Trading
    status: 'pending',
    date: '2026-08-10T14:30:00Z',
    items: [
      { id: '2-1', productName: 'Logistics Module', quantity: 1, unitPrice: 2000, amount: 2000 },
      { id: '2-2', productName: 'Data Migration', quantity: 1, unitPrice: 800, amount: 800 },
    ],
    totalAmount: 2800,
    createdAt: '2026-08-10T14:30:00Z',
    updatedAt: '2026-08-10T14:30:00Z',
  },
  {
    id: 3,
    customerId: 4, // Bluepeak Retail
    status: 'rejected',
    date: '2026-07-25T11:00:00Z',
    items: [
      { id: '3-1', productName: 'Retail Analytics Tool', quantity: 5, unitPrice: 300, amount: 1500 },
    ],
    totalAmount: 1500,
    createdAt: '2026-07-25T11:00:00Z',
    updatedAt: '2026-07-28T09:15:00Z',
  },
  {
    id: 4,
    customerId: 1, // Acme Corp
    status: 'pending',
    date: '2026-08-12T10:15:00Z',
    items: [
      { id: '4-1', productName: 'Custom Integration', quantity: 1, unitPrice: 12000, amount: 12000 },
    ],
    totalAmount: 12000,
    createdAt: '2026-08-12T10:15:00Z',
    updatedAt: '2026-08-12T10:15:00Z',
  },
  {
    id: 5,
    customerId: 5, // Orbit Logistics
    status: 'approved',
    date: '2026-06-15T08:45:00Z',
    items: [
      { id: '5-1', productName: 'Route Optimizer Pro', quantity: 2, unitPrice: 1500, amount: 3000 },
      { id: '5-2', productName: 'API Access (Yearly)', quantity: 1, unitPrice: 500, amount: 500 },
    ],
    totalAmount: 3500,
    createdAt: '2026-06-15T08:45:00Z',
    updatedAt: '2026-06-16T14:20:00Z',
  },
  {
    id: 6,
    customerId: 8, // Medicore Health
    status: 'approved',
    date: '2026-05-10T13:00:00Z',
    items: [
      { id: '6-1', productName: 'HIPAA Compliance Add-on', quantity: 1, unitPrice: 4000, amount: 4000 },
    ],
    totalAmount: 4000,
    createdAt: '2026-05-10T13:00:00Z',
    updatedAt: '2026-05-12T10:00:00Z',
  },
  {
    id: 7,
    customerId: 10, // Pixel Creative
    status: 'rejected',
    date: '2026-07-02T16:20:00Z',
    items: [
      { id: '7-1', productName: 'Design Assets Pack', quantity: 3, unitPrice: 200, amount: 600 },
      { id: '7-2', productName: 'Premium Fonts', quantity: 10, unitPrice: 50, amount: 500 },
    ],
    totalAmount: 1100,
    createdAt: '2026-07-02T16:20:00Z',
    updatedAt: '2026-07-10T11:45:00Z',
  },
  {
    id: 8,
    customerId: 13, // Nova Dynamics
    status: 'pending',
    date: '2026-08-13T09:30:00Z',
    items: [
      { id: '8-1', productName: 'Engineering Workstation VM', quantity: 5, unitPrice: 800, amount: 4000 },
      { id: '8-2', productName: 'Cloud Storage (1TB)', quantity: 10, unitPrice: 20, amount: 200 },
    ],
    totalAmount: 4200,
    createdAt: '2026-08-13T09:30:00Z',
    updatedAt: '2026-08-13T09:30:00Z',
  },
  {
    id: 9,
    customerId: 15, // Frostbyte Games
    status: 'approved',
    date: '2026-03-20T11:15:00Z',
    items: [
      { id: '9-1', productName: 'Game Engine License', quantity: 1, unitPrice: 20000, amount: 20000 },
    ],
    totalAmount: 20000,
    createdAt: '2026-03-20T11:15:00Z',
    updatedAt: '2026-03-25T15:10:00Z',
  },
  {
    id: 10,
    customerId: 12, // Bright Education
    status: 'pending',
    date: '2026-08-05T10:00:00Z',
    items: [
      { id: '10-1', productName: 'Educational Software Suite', quantity: 50, unitPrice: 25, amount: 1250 },
      { id: '10-2', productName: 'Teacher Training', quantity: 2, unitPrice: 500, amount: 1000 },
    ],
    totalAmount: 2250,
    createdAt: '2026-08-05T10:00:00Z',
    updatedAt: '2026-08-05T10:00:00Z',
  },
]
