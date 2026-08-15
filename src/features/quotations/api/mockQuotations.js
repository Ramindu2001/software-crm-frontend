/**
 * Seed data for the mock quotations API.
 *
 * Stored the way the API stores them — server-computed totals in whole
 * currency units, a capitalised status, and no line items, because there is no
 * endpoint that reads items back. `customerId` refers to mockCustomers.
 *
 * The QT-YYYY-NNN reference is derived per year rather than stored, exactly as
 * the backend derives it, so it is not a field here.
 */

export const MOCK_QUOTATIONS = [
  {
    id: 1,
    customerId: 1,
    totalAmount: 110000,
    discount: 5000,
    finalAmount: 105000,
    status: 'Approved',
    itemsCount: 2,
    createdAt: '2026-01-14T09:30:00Z',
  },
  {
    id: 2,
    customerId: 3,
    totalAmount: 300000,
    discount: 0,
    finalAmount: 300000,
    status: 'Pending',
    itemsCount: 1,
    createdAt: '2026-02-02T11:15:00Z',
  },
  {
    id: 3,
    customerId: 2,
    totalAmount: 120000,
    discount: 12000,
    finalAmount: 108000,
    status: 'Rejected',
    itemsCount: 1,
    createdAt: '2026-03-21T14:45:00Z',
  },
  {
    id: 4,
    customerId: 5,
    totalAmount: 550000,
    discount: 50000,
    finalAmount: 500000,
    status: 'Approved',
    itemsCount: 3,
    createdAt: '2026-04-08T08:05:00Z',
  },
  {
    id: 5,
    customerId: 4,
    totalAmount: 90000,
    discount: 0,
    finalAmount: 90000,
    status: 'Pending',
    itemsCount: 1,
    createdAt: '2026-05-19T16:20:00Z',
  },
  {
    id: 6,
    customerId: 7,
    totalAmount: 240000,
    discount: 15000,
    finalAmount: 225000,
    status: 'Pending',
    itemsCount: 2,
    createdAt: '2026-06-30T10:00:00Z',
  },
  {
    id: 7,
    customerId: 9,
    totalAmount: 175000,
    discount: 0,
    finalAmount: 175000,
    status: 'Approved',
    itemsCount: 2,
    createdAt: '2026-07-11T13:40:00Z',
  },
  {
    id: 8,
    customerId: 6,
    totalAmount: 60000,
    discount: 6000,
    finalAmount: 54000,
    status: 'Pending',
    itemsCount: 1,
    createdAt: '2026-08-03T09:55:00Z',
  },
]
