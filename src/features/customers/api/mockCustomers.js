/**
 * Seed data for the mock customers API.
 *
 * Six fields, because six is what GET /api/customers returns — `address`
 * included, since the customer table renders it and fetching it per row would
 * be a request per customer. `created_at` is in the table but not the payload,
 * so it is not here either.
 *
 * A few rows leave `address` null on purpose: it is optional, and the UI has
 * to render the empty case as readily as the filled one.
 */

export const MOCK_CUSTOMERS = [
  {
    id: 1,
    company_name: 'Acme Corp',
    contact_person: 'Priya Kumar',
    email: 'priya@acmecorp.com',
    phone: '0771234567',
    address: '12 Galle Road, Colombo 03',
  },
  {
    id: 2,
    company_name: 'Bluepeak Retail',
    contact_person: 'Lena Ortiz',
    email: 'lena@bluepeak.co',
    phone: '0774561230',
    address: '48 Marine Drive, Colombo 06',
  },
  {
    id: 3,
    company_name: 'Northwind Trading',
    contact_person: 'Marcus Webb',
    email: 'marcus@northwind.io',
    phone: '0779876543',
    address: '7 Nawam Mawatha, Colombo 02',
  },
  {
    id: 4,
    company_name: 'Orbit Logistics',
    contact_person: 'Tomas Reid',
    email: 'tomas@orbitlog.com',
    phone: '0712345678',
    address: null,
  },
  {
    id: 5,
    company_name: 'Vertex Labs',
    contact_person: 'Ishara Wickrama',
    email: 'hello@vertexlabs.dev',
    phone: '0765554321',
    address: '221 Kandy Road, Kadawatha',
  },
  {
    id: 6,
    company_name: 'Harbour Foods',
    contact_person: 'Nuwan Silva',
    email: 'accounts@harbourfoods.lk',
    phone: '0117654321',
    address: '9 Harbour View, Trincomalee',
  },
  {
    id: 7,
    company_name: 'Cedar Health',
    contact_person: 'Dr. Anjali Rao',
    email: 'admin@cedarhealth.com',
    phone: '0723334455',
    address: '155 Peradeniya Road, Kandy',
  },
  {
    id: 8,
    company_name: 'Kandy Textiles',
    contact_person: 'Ruwan Bandara',
    email: 'ruwan@kandytextiles.lk',
    phone: '0812223344',
    address: null,
  },
  {
    id: 9,
    company_name: 'Summit Engineering',
    contact_person: 'Grace Liu',
    email: 'grace@summit-eng.com',
    phone: '0701112233',
    address: '3 Summit Place, Battaramulla',
  },
  {
    id: 10,
    company_name: 'Lotus Media',
    contact_person: 'Dinesh Perera',
    email: 'dinesh@lotusmedia.lk',
    phone: '0759998877',
    address: '62 Duplication Road, Colombo 04',
  },
  {
    id: 11,
    company_name: 'Pinnacle Realty',
    contact_person: 'Sarah Mendis',
    email: 'sarah@pinnaclerealty.lk',
    phone: '0778887766',
    address: '18 Flower Road, Colombo 07',
  },
  {
    id: 12,
    company_name: 'Aster Aviation',
    contact_person: 'Kavindu Jayasuriya',
    email: 'ops@asteraviation.com',
    phone: '0114445566',
    address: null,
  },
]
