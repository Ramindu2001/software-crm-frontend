/**
 * Seed data for the mock customers API.
 *
 * Five fields, because five is what GET /api/customers returns. The schema has
 * an `address` column that the endpoint omits, and no status, industry or
 * issue-count anywhere — so none of those appear here either. Keeping the mock
 * honest about what the API can supply is what stops a component being built
 * against a field that will never arrive.
 */

export const MOCK_CUSTOMERS = [
  {
    id: 1,
    company_name: 'Acme Corp',
    contact_person: 'Priya Kumar',
    email: 'priya@acmecorp.com',
    phone: '0771234567',
  },
  {
    id: 2,
    company_name: 'Bluepeak Retail',
    contact_person: 'Lena Ortiz',
    email: 'lena@bluepeak.co',
    phone: '0774561230',
  },
  {
    id: 3,
    company_name: 'Northwind Trading',
    contact_person: 'Marcus Webb',
    email: 'marcus@northwind.io',
    phone: '0779876543',
  },
  {
    id: 4,
    company_name: 'Orbit Logistics',
    contact_person: 'Tomas Reid',
    email: 'tomas@orbitlog.com',
    phone: '0712345678',
  },
  {
    id: 5,
    company_name: 'Vertex Labs',
    contact_person: 'Ishara Wickrama',
    email: 'hello@vertexlabs.dev',
    phone: '0765554321',
  },
  {
    id: 6,
    company_name: 'Harbour Foods',
    contact_person: 'Nuwan Silva',
    email: 'accounts@harbourfoods.lk',
    phone: '0117654321',
  },
  {
    id: 7,
    company_name: 'Cedar Health',
    contact_person: 'Dr. Anjali Rao',
    email: 'admin@cedarhealth.com',
    phone: '0723334455',
  },
  {
    id: 8,
    company_name: 'Kandy Textiles',
    contact_person: 'Ruwan Bandara',
    email: 'ruwan@kandytextiles.lk',
    phone: '0812223344',
  },
  {
    id: 9,
    company_name: 'Summit Engineering',
    contact_person: 'Grace Liu',
    email: 'grace@summit-eng.com',
    phone: '0701112233',
  },
  {
    id: 10,
    company_name: 'Lotus Media',
    contact_person: 'Dinesh Perera',
    email: 'dinesh@lotusmedia.lk',
    phone: '0759998877',
  },
  {
    id: 11,
    company_name: 'Pinnacle Realty',
    contact_person: 'Sarah Mendis',
    email: 'sarah@pinnaclerealty.lk',
    phone: '0778887766',
  },
  {
    id: 12,
    company_name: 'Aster Aviation',
    contact_person: 'Kavindu Jayasuriya',
    email: 'ops@asteraviation.com',
    phone: '0114445566',
  },
]
