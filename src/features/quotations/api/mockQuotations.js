/**
 * Seed data for the mock quotations API.
 *
 * Line items carry their snapshot inline — product name, package name, all
 * three fees, features and requirements — because that is how a stored
 * quotation looks once created. Nothing here references live product data, so
 * editing MOCK_PRODUCTS leaves these untouched, exactly as the real tables
 * behave.
 *
 * `customerId` refers to mockCustomers; `productId` / `packageId` to
 * mockProducts, kept accurate so the ids resolve if anything follows them.
 */

const POS_BASIC = {
  productId: 1,
  productName: 'POS System',
  packageId: 1,
  packageName: 'Basic',
  firstYearFee: 50000,
  renewalFee: 40000,
  monthlyPrice: 5000,
  features: ['DINE-IN', 'TAKEAWAY', 'BILLING'],
  basicRequirements: ['Company Logo', 'Menu Excel Sheet'],
  softwareRequirements: ['Windows 10', '8GB RAM'],
}

const POS_PREMIUM = {
  productId: 1,
  productName: 'POS System',
  packageId: 2,
  packageName: 'Premium',
  firstYearFee: 90000,
  renewalFee: 75000,
  monthlyPrice: 9000,
  features: ['DINE-IN', 'TAKEAWAY', 'DELIVERY', 'BILLING', 'ANALYTICS'],
  basicRequirements: ['Company Logo', 'Menu Excel Sheet'],
  softwareRequirements: ['Windows 10', '8GB RAM'],
}

const ERP_BUSINESS = {
  productId: 3,
  productName: 'Synnex ERP Enterprise',
  packageId: 4,
  packageName: 'Business',
  firstYearFee: 300000,
  renewalFee: 200000,
  monthlyPrice: 25000,
  features: ['Core ERP Modules', 'Up to 20 Users', 'Standard Support'],
  basicRequirements: ['Quad-core processor', '8GB RAM minimum', '100GB SSD storage'],
  softwareRequirements: ['Windows Server 2019 or later', 'SQL Server 2019'],
}

/** Build a stored line from a package snapshot plus the chosen plan. */
const line = (id, snapshot, plan, quantity = 1) => {
  const unitPrice = plan === 'Annual' ? snapshot.firstYearFee : snapshot.monthlyPrice
  return {
    id,
    ...snapshot,
    plan,
    quantity,
    unitPrice,
    totalPrice: unitPrice * quantity,
  }
}

export const MOCK_QUOTATIONS = [
  {
    id: 1,
    customerId: 1,
    preparedByName: 'Admin User',
    items: [line(1, POS_BASIC, 'Annual')],
    totalAmount: 50000,
    discountPercent: 10,
    discount: 5000,
    finalAmount: 45000,
    status: 'Approved',
    paymentTerms: 'BANK DEPOSIT / ONLINE TRANSFER / KOKO / ON PREMISES CASH PAYMENT',
    termsConditions: '',
    notes: '',
    validUntil: '2026-01-17',
    createdAt: '2026-01-14T09:30:00Z',
  },
  {
    id: 2,
    customerId: 3,
    preparedByName: 'Support User',
    items: [line(2, ERP_BUSINESS, 'Annual')],
    totalAmount: 300000,
    discountPercent: 0,
    discount: 0,
    finalAmount: 300000,
    status: 'Pending',
    paymentTerms: 'BANK DEPOSIT / ONLINE TRANSFER / KOKO / ON PREMISES CASH PAYMENT',
    termsConditions: '',
    notes: 'Client asked for a phased rollout across two branches.',
    validUntil: '2026-02-05',
    createdAt: '2026-02-02T11:15:00Z',
  },
  {
    id: 3,
    customerId: 2,
    preparedByName: 'Support User',
    items: [line(3, POS_PREMIUM, 'Monthly', 12)],
    totalAmount: 108000,
    discountPercent: 0,
    discount: 0,
    finalAmount: 108000,
    status: 'Rejected',
    paymentTerms: 'BANK DEPOSIT / ONLINE TRANSFER / KOKO / ON PREMISES CASH PAYMENT',
    termsConditions: '',
    notes: '',
    validUntil: '2026-03-24',
    createdAt: '2026-03-21T14:45:00Z',
  },
  {
    id: 4,
    customerId: 5,
    preparedByName: 'Admin User',
    items: [line(4, POS_PREMIUM, 'Annual'), line(5, ERP_BUSINESS, 'Annual')],
    totalAmount: 390000,
    discountPercent: 5,
    discount: 19500,
    finalAmount: 370500,
    status: 'Approved',
    paymentTerms: 'BANK DEPOSIT / ONLINE TRANSFER / KOKO / ON PREMISES CASH PAYMENT',
    termsConditions: '',
    notes: '',
    validUntil: '2026-04-11',
    createdAt: '2026-04-08T08:05:00Z',
  },
  {
    id: 5,
    customerId: 4,
    preparedByName: 'Support User',
    items: [line(6, POS_BASIC, 'Monthly', 6)],
    totalAmount: 30000,
    discountPercent: 0,
    discount: 0,
    finalAmount: 30000,
    status: 'Pending',
    paymentTerms: 'BANK DEPOSIT / ONLINE TRANSFER / KOKO / ON PREMISES CASH PAYMENT',
    termsConditions: '',
    notes: '',
    validUntil: '2026-05-22',
    createdAt: '2026-05-19T16:20:00Z',
  },
]
