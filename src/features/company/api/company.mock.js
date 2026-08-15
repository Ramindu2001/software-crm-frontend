/**
 * Mock company settings.
 *
 * Seeded from the letterhead on the existing quotation template, matching what
 * `npm run migrate` writes, so a quotation rendered in mock mode looks like the
 * real thing.
 *
 * No top-level function calls — the bundler can tree-shake this module when
 * the HTTP implementation is selected.
 */

const LATENCY_MS = 260

const delay = (ms = LATENCY_MS) =>
  new Promise((resolve) => setTimeout(resolve, ms))

const DEFAULT_TERMS = [
  '1. The customer will be billed upon acceptance of this quotation.',
  '2. A non-refundable deposit of 25% of the initial setup fee is required before commencing the software installation or setup process.',
  '3. This quotation is valid for 3 days from the date of issuance.',
  '4. All payments must be made within 1 day of receiving the invoice. Late payments may incur a 5% penalty per day.',
  '5. Any modifications or additional requirements requested after the quotation has been accepted may result in an adjustment to the pricing.',
  '6. The software setup timeline will be provided after the deposit is received, and delays in payment or customer responsiveness may extend the delivery schedule.',
  '7. The company is not liable for delays caused by third-party software, hardware, or external factors beyond its control.',
  '8. Warranty or support services (if any) are provided as per the terms outlined in a separate agreement.',
  '9. The customer should agrees to provide all necessary information, access, and support required for successful installation and setup.',
  '10. This quotation and any details related to pricing, services, and terms are confidential and must not be disclosed to third parties without written consent from both parties.',
].join('\n')

const SEED = {
  companyName: 'SYNNEX IT SOLUTION',
  address: 'No 12, Daisy Villa Ave, R. A. De Mel Mawatha, Colombo 04',
  phone: '011 255 9466 | 0743935716',
  email: '',
  website: '',
  logoPath: '',
  paymentTerms: 'BANK DEPOSIT / ONLINE TRANSFER / KOKO / ON PREMISES CASH PAYMENT',
  termsConditions: DEFAULT_TERMS,
  quotationValidityDays: 3,
  updatedAt: null,
}

let store = null

function getStore() {
  store ??= { ...SEED }
  return store
}

/**
 * In mock mode the "upload" is a local object URL, so the preview works
 * without a server. It lives only for the page session — which is the honest
 * behaviour, since nothing was persisted anywhere.
 */
export function logoUrl(logoPath) {
  return logoPath || ''
}

export async function getCompanySettings() {
  await delay()
  return { ...getStore() }
}

export async function updateCompanySettings(input) {
  await delay(380)
  store = {
    ...getStore(),
    companyName: input.companyName?.trim(),
    address: input.address?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    email: input.email?.trim() ?? '',
    website: input.website?.trim() ?? '',
    paymentTerms: input.paymentTerms?.trim() ?? '',
    termsConditions: input.termsConditions?.trim() ?? '',
    quotationValidityDays: Number(input.quotationValidityDays) || 3,
    updatedAt: new Date().toISOString(),
  }
  return { ...getStore() }
}

export async function uploadCompanyLogo(file) {
  await delay(420)
  store = { ...getStore(), logoPath: URL.createObjectURL(file) }
  return { ...getStore() }
}

export async function deleteCompanyLogo() {
  await delay(220)
  store = { ...getStore(), logoPath: '' }
  return { ...getStore() }
}
