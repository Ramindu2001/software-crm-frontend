import { logoUrl } from '@/features/company'
import { formatDate } from '@/lib/format'
import { formatRupees } from '@/lib/format'

/**
 * The printable quotation, reproducing the company's existing paper template.
 *
 * Rendered from a single detail response: line items carry their own snapshot
 * (package name, all three fees, features, requirements) so nothing here
 * reaches for live product data, and the letterhead comes from company
 * settings read at request time.
 *
 * ── On the print styles ──
 * This component is the preview AND the printed page — there is no second
 * template to keep in sync, which is the whole reason for choosing browser
 * printing over a server-side renderer. `@page` sets A4 with sane margins, and
 * `print:` utilities strip the screen chrome. Anything the printed sheet must
 * not show is marked `print:hidden` by the caller rather than here, so this
 * component stays a pure document.
 *
 * Widths are in millimetres and the sheet is fixed at A4, so the on-screen
 * preview is a true representation rather than an approximation that surprises
 * someone at the printer.
 */

/** A blue section bar, matching the template's headers. */
function SectionBar({ children }) {
  return (
    <div className="bg-[#1668c1] px-2 py-1 text-center text-[11px] font-bold tracking-wide text-white uppercase print:bg-[#1668c1]">
      {children}
    </div>
  )
}

function LabelledRow({ label, value }) {
  return (
    <div className="flex gap-1 text-[11px] leading-snug">
      <span className="w-32 shrink-0 text-ink">{label}</span>
      <span className="shrink-0">:</span>
      <span className="min-w-0 flex-1 break-words text-ink">{value || '—'}</span>
    </div>
  )
}

/**
 * @param {object} props
 * @param {object} props.quotation Full detail from GET /api/quotations/:id.
 */
export function QuotationDocument({ quotation }) {
  const { company, customer, items } = quotation
  const logo = logoUrl(company.logoPath)

  // Requirements and features are per line, but the template prints them once
  // beneath the package table. Deduplicated across lines, preserving the order
  // they were snapshotted in — two lines of the same product would otherwise
  // repeat every requirement.
  const dedupe = (values) => [...new Set(values)]
  const basicRequirements = dedupe(items.flatMap((item) => item.basicRequirements))
  const softwareRequirements = dedupe(items.flatMap((item) => item.softwareRequirements))
  const features = dedupe(items.flatMap((item) => item.features))

  return (
    <article
      // 210mm is A4 width; the padding matches the @page margin so the preview
      // and the print have the same text block.
      className="mx-auto w-[210mm] max-w-full bg-white p-[12mm] text-[#111] shadow-sm print:w-auto print:max-w-none print:p-0 print:shadow-none"
      aria-label={`Quotation ${quotation.id}`}
    >
      {/* ── Masthead ─────────────────────────────────────── */}
      <header className="flex items-start justify-between gap-6 border border-[#111] p-3">
        <div>
          <h1 className="text-2xl leading-none font-bold tracking-tight">QUOTATION</h1>
          <dl className="mt-2 space-y-0.5 text-[11px] leading-snug">
            <div className="flex gap-1">
              <dt>Quotation ID:</dt>
              <dd className="font-medium">{quotation.id}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Date:</dt>
              <dd>{formatDate(quotation.createdAt)}</dd>
            </div>
            <div className="flex gap-1">
              <dt>Prepared by:</dt>
              <dd>{quotation.preparedBy || '—'}</dd>
            </div>
            {quotation.validUntil && (
              <div className="flex gap-1">
                <dt>Valid until:</dt>
                <dd>{formatDate(quotation.validUntil)}</dd>
              </div>
            )}
          </dl>
        </div>

        {logo ? (
          <img
            src={logo}
            alt={company.companyName}
            className="max-h-16 max-w-[52mm] object-contain"
          />
        ) : (
          // No placeholder box on paper — an empty frame where a logo should
          // be looks like a printing fault.
          <span className="text-right text-sm font-bold tracking-wide text-[#1668c1]">
            {company.companyName}
          </span>
        )}
      </header>

      {/* Address strip */}
      <p className="mt-2 bg-[#1668c1] px-3 py-1.5 text-center text-[11px] font-bold text-white print:bg-[#1668c1]">
        {[company.address, company.phone].filter(Boolean).join(' | ')}
      </p>

      {/* ── Client ───────────────────────────────────────── */}
      <section className="mt-3 border border-[#111] p-3">
        <div className="mb-2 w-1/2 min-w-[70mm]">
          <SectionBar>Client Information</SectionBar>
        </div>
        <div className="space-y-0.5">
          <LabelledRow label="Company Name" value={customer.name} />
          <LabelledRow label="Contact Person" value={customer.contactPerson} />
          <LabelledRow label="Telephone No" value={customer.phone} />
          <LabelledRow label="Address" value={customer.address} />
          <LabelledRow label="Email" value={customer.email} />
        </div>
      </section>

      {/* ── Line items and totals ────────────────────────── */}
      <section className="mt-3 border border-[#111] p-3">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="w-[55%] border border-[#111] bg-[#1668c1] px-2 py-1 text-center font-bold text-white print:bg-[#1668c1]">
                Service / Product
              </th>
              <th className="border border-[#111] bg-[#1668c1] px-2 py-1 text-center font-bold text-white print:bg-[#1668c1]">
                Estimated Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="border border-[#111] px-2 py-1 align-top">
                  {item.productName}
                  {item.packageName && ` — ${item.packageName}`}
                  <span className="text-[#555]">
                    {' '}
                    ({item.plan === 'Annual' ? 'Annual' : 'Monthly'})
                  </span>
                  {item.quantity > 1 && (
                    <span className="text-[#555]">
                      {' '}
                      × {item.quantity} @ {formatRupees(item.unitPrice)}
                    </span>
                  )}
                </td>
                <td className="border border-[#111] px-2 py-1 text-right tabular-nums">
                  {formatRupees(item.totalPrice)}
                </td>
              </tr>
            ))}

            <tr>
              <td className="px-2 py-1 text-right">Total:</td>
              <td className="border border-[#111] px-2 py-1 text-right tabular-nums">
                {formatRupees(quotation.totalAmount)}
              </td>
            </tr>
            <tr>
              <td className="px-2 py-1 text-right">Discount</td>
              <td className="border border-[#111] px-2 py-1 text-right tabular-nums">
                {quotation.discountPercent}%
              </td>
            </tr>
            <tr>
              <td className="px-2 py-1 text-right font-bold">Grand total:</td>
              <td className="border border-[#111] px-2 py-1 text-right font-bold tabular-nums">
                {formatRupees(quotation.finalAmount)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      {features.length > 0 && (
        <section className="mt-3 border border-[#111] p-3">
          <SectionBar>Software Features</SectionBar>
          <ul className="mt-2 space-y-0.5 text-[11px]">
            {features.map((feature) => (
              <li key={feature}>* {feature}</li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Package / subscription pricing ───────────────── */}
      <section className="mt-3 border border-[#111] p-3">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              {['Package Type', 'Annual Subscription', 'Monthly Subscription', 'Comments'].map(
                (heading) => (
                  <th
                    key={heading}
                    className="border border-[#111] bg-[#1668c1] px-2 py-1 text-center font-bold text-white print:bg-[#1668c1]"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="border border-[#111] px-2 py-1 text-center">
                  {item.packageName || '—'}
                </td>
                {/* The renewal rate, not the first-year fee — the first year is
                    already priced in the table above, and quoting it twice
                    reads as a second charge. */}
                <td className="border border-[#111] px-2 py-1 text-center tabular-nums">
                  {formatRupees(item.renewalFee)}
                </td>
                <td className="border border-[#111] px-2 py-1 text-center tabular-nums">
                  {formatRupees(item.monthlyPrice)}
                </td>
                <td className="border border-[#111] px-2 py-1 text-center">
                  {item.plan === 'Annual'
                    ? 'Annual plan selected — renewal from year two'
                    : 'Monthly plan selected'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(basicRequirements.length > 0 || softwareRequirements.length > 0) && (
          <div className="mt-3 grid grid-cols-2 gap-4 text-[10px] leading-snug">
            <div>
              {basicRequirements.length > 0 && (
                <>
                  <p className="font-bold">Basic Requirement:</p>
                  {basicRequirements.map((requirement) => (
                    <p key={requirement}>{requirement}</p>
                  ))}
                </>
              )}
            </div>
            <div>
              {softwareRequirements.length > 0 && (
                <>
                  <p className="font-bold">Software Requirements:</p>
                  {softwareRequirements.map((requirement) => (
                    <p key={requirement}>{requirement}</p>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {quotation.notes && (
          <p className="mt-3 text-[10px] leading-snug whitespace-pre-line">
            {quotation.notes}
          </p>
        )}
      </section>

      {/* ── Payment terms ────────────────────────────────── */}
      {quotation.paymentTerms && (
        <p className="mt-3 border border-[#111] px-3 py-2 text-center text-[11px] font-bold">
          PAYMENT TERMS – {quotation.paymentTerms}
        </p>
      )}

      {/* ── Terms & conditions ───────────────────────────── */}
      {quotation.termsConditions && (
        <section className="mt-3 border border-[#111] p-3">
          <div className="bg-[#1668c1] px-2 py-1 text-[11px] font-bold text-white uppercase print:bg-[#1668c1]">
            Terms and Conditions
          </div>
          {/* Stored as free text, one clause per line, so it renders exactly
              as the admin typed it rather than being re-numbered here. */}
          <p className="mt-2 text-[10px] leading-snug whitespace-pre-line">
            {quotation.termsConditions}
          </p>
        </section>
      )}
    </article>
  )
}
