import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Printer, TriangleAlert } from 'lucide-react'
import { EmptyState, PageHeader, RouteFallback } from '@/components/common'
import { Badge, Button, Select } from '@/components/ui'
import { PERMISSIONS, useAuth } from '@/features/auth'
import { toast } from '@/lib/toastStore'
import { updateQuotationStatus } from '../api'
import { useQuotation } from '../hooks'
import {
  isEditable,
  QUOTATION_STATUS,
  QUOTATION_STATUS_OPTIONS,
} from '../constants'
import { QuotationDocument } from './QuotationDocument'
import { QuotationProspectBanner } from './QuotationProspectBanner'

/**
 * A single quotation: the document itself, plus the actions around it.
 *
 * The document is rendered by the same component the print route uses, so what
 * is on screen is exactly what comes out of the printer — there is no second
 * template to keep in sync.
 *
 * Everything that is not the document is marked `print:hidden`, so this page
 * is directly printable too; the dedicated /print route exists for a clean
 * window without the app shell, not because this one cannot print.
 */
export function QuotationDetailPage() {
  const { quotationId } = useParams()
  const { quotation, isLoading, error, applyQuotation } = useQuotation(quotationId)

  const { can } = useAuth()
  const canEdit = can(PERMISSIONS.QUOTATIONS_CREATE)
  const canSetStatus = can(PERMISSIONS.QUOTATIONS_SET_STATUS)

  const [isUpdating, setIsUpdating] = useState(false)

  if (isLoading) return <RouteFallback />

  if (error || !quotation) {
    return (
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
    )
  }

  const handleStatusChange = async (event) => {
    const status = event.target.value
    setIsUpdating(true)

    try {
      const result = await updateQuotationStatus(quotation.quotationId, status)
      // The endpoint answers with the reference and new status alone, so the
      // change is merged into the document already on screen rather than
      // refetching the whole thing.
      applyQuotation({ ...quotation, status: result.status })
      toast.success('Status updated', {
        description: `${result.id} is now ${result.status.toLowerCase()}.`,
      })
    } catch (caught) {
      toast.error('Could not update the status', { description: caught.message })
    } finally {
      setIsUpdating(false)
    }
  }

  const meta = QUOTATION_STATUS[quotation.status]
  const editable = isEditable(quotation)

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          description={`Prepared by ${quotation.preparedBy || 'Unknown'} for ${quotation.customer.name}.`}
          actions={
            <>
              {canEdit && editable && (
                <Button
                  as={Link}
                  to={`/quotations/${quotation.id}/edit`}
                  size="sm"
                  variant="secondary"
                >
                  <Pencil className="mr-1.5 size-4" aria-hidden="true" />
                  Edit
                </Button>
              )}
              <Button as={Link} to={`/quotations/${quotation.id}/print`} size="sm">
                <Printer className="mr-1.5 size-4" aria-hidden="true" />
                Print / Save as PDF
              </Button>
            </>
          }
        />

        <Link
          to="/quotations"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to quotations
        </Link>

        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
          <span className="font-mono text-sm font-medium text-ink">{quotation.id}</span>

          {canSetStatus ? (
            <Select
              aria-label={`Status for ${quotation.id}`}
              value={quotation.status}
              onChange={handleStatusChange}
              options={QUOTATION_STATUS_OPTIONS}
              disabled={isUpdating}
              wrapperClassName="w-40"
            />
          ) : (
            <Badge tone={meta?.tone ?? 'neutral'} dot>
              {meta?.label ?? quotation.status}
            </Badge>
          )}

          {!editable && (
            <span className="text-sm text-ink-muted">
              {quotation.status} quotations are locked. Create a new one to change
              the offer.
            </span>
          )}
        </div>

        {/* Renders nothing unless the quotation was raised for somebody outside
            the customer directory. */}
        <QuotationProspectBanner
          quotation={quotation}
          canEdit={canEdit}
          onLinked={(updated) => {
            applyQuotation(updated)
            toast.success('Customer added', {
              description: `${updated.customer.name} is now in your customer list.`,
            })
          }}
        />
      </div>

      {/* The document. Bounded and scrollable on screen so an A4 sheet does
          not force the whole page sideways on a narrow window. */}
      <div className="overflow-x-auto print:overflow-visible">
        <QuotationDocument quotation={quotation} />
      </div>
    </>
  )
}
