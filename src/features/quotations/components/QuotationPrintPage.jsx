import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, TriangleAlert } from 'lucide-react'
import { EmptyState, RouteFallback } from '@/components/common'
import { Button } from '@/components/ui'
import { useQuotation } from '../hooks'
import { QuotationDocument } from './QuotationDocument'

/**
 * The quotation on its own, ready to print.
 *
 * Rendered outside the dashboard shell — no sidebar, no topbar — so what fills
 * the window is the document. The toolbar is `print:hidden`, leaving the sheet
 * alone on paper.
 *
 * Print styles live here rather than in index.css because they only apply to
 * this route. `@page` sets A4 and the margins; `print-color-adjust` is what
 * keeps the blue section bars from being dropped, since browsers strip
 * background colours from printed pages by default and the template is mostly
 * blue bars.
 */
export function QuotationPrintPage() {
  const { quotationId } = useParams()
  const { quotation, isLoading, error } = useQuotation(quotationId)

  // Reflect the reference in the tab title, because that is what the browser
  // offers as the filename when saving to PDF — "Synnex CMS" would be a poor
  // name for every quotation ever exported.
  useEffect(() => {
    if (!quotation) return undefined

    const previous = document.title
    document.title = `Quotation ${quotation.id} — ${quotation.customer.name}`
    return () => {
      document.title = previous
    }
  }, [quotation])

  if (isLoading) return <RouteFallback />

  if (error || !quotation) {
    return (
      <div className="p-6">
        <EmptyState
          icon={TriangleAlert}
          title="Quotation not found"
          description={error?.message ?? 'This quotation may have been removed.'}
          action={
            <Button as={Link} to="/quotations" size="sm">
              Back to quotations
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sunken py-6 print:bg-white print:py-0">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body { background: #fff; }
          /* The template is built from blue section bars; without this every
             browser drops them and the document prints as bare text. */
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="mx-auto mb-5 flex w-[210mm] max-w-full items-center justify-between gap-3 px-2 print:hidden">
        <Button as={Link} to={`/quotations/${quotation.id}`} size="sm" variant="ghost">
          <ArrowLeft className="mr-1.5 size-4" aria-hidden="true" />
          Back
        </Button>

        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 size-4" aria-hidden="true" />
          Print / Save as PDF
        </Button>
      </div>

      <QuotationDocument quotation={quotation} />
    </div>
  )
}
