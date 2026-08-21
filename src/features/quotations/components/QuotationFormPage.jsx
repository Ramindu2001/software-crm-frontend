import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, ShieldAlert, TriangleAlert, Wrench } from 'lucide-react'
import { ApiErrorAlert, EmptyState, PageHeader, RouteFallback } from '@/components/common'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from '@/components/ui'
import { PERMISSIONS, useAuth } from '@/features/auth'
import { useCompanySettings } from '@/features/company'
import { formatRupees } from '@/lib/format'
import { toast } from '@/lib/toastStore'
import { createQuotation, updateQuotation } from '../api'
import { useQuotation, useQuotationBuilder } from '../hooks'
import { isEditable } from '../constants'
import { QuotationCustomerSection } from './QuotationCustomerSection'
import { QuotationLineItem } from './QuotationLineItem'

/**
 * Build or edit a quotation.
 *
 * A full page rather than a modal: a quotation carries line items, package and
 * plan choices, ten clauses of terms and a live total. That does not fit a
 * dialog, and a dialog would also make the running total compete with the form
 * for the same cramped space.
 *
 * Editing is only possible while a quotation is Pending. Once the customer has
 * approved or rejected a specific document, changing it is a new quotation —
 * the API refuses it with a 409 and this page refuses to open.
 */
export function QuotationFormPage() {
  const { quotationId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(quotationId)

  // `?customer=4` — how a won lead hands off to a quotation. The lead knows who
  // it became, so the form opens on that customer rather than making the user
  // find them again in a list of everybody.
  const [searchParams] = useSearchParams()
  const initialCustomerId = searchParams.get('customer') ?? ''

  const { can } = useAuth()
  const canCreate = can(PERMISSIONS.QUOTATIONS_CREATE)

  const { settings, isLoading: isLoadingCompany } = useCompanySettings()
  const {
    quotation,
    isLoading: isLoadingQuotation,
    error: loadError,
  } = useQuotation(isEdit ? quotationId : null)

  const builder = useQuotationBuilder({
    companySettings: settings,
    initialQuotation: isEdit ? quotation : null,
    initialCustomerId: isEdit ? undefined : initialCustomerId,
  })

  const [errors, setErrors] = useState({})
  const [lineErrors, setLineErrors] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  if (!canCreate) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Not permitted"
        description="You need the create quotations permission to build one."
        action={
          <Button as={Link} to="/quotations" size="sm">
            Back to quotations
          </Button>
        }
      />
    )
  }

  if (isLoadingCompany || (isEdit && isLoadingQuotation)) return <RouteFallback />

  if (isEdit && loadError) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Quotation not found"
        description={loadError.message ?? 'This quotation may have been removed.'}
        action={
          <Button as={Link} to="/quotations" size="sm">
            Back to quotations
          </Button>
        }
      />
    )
  }

  // Checked here as well as server-side so an approved quotation reached by a
  // stale link explains itself instead of failing on save.
  if (isEdit && quotation && !isEditable(quotation)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title={`${quotation.id} can no longer be edited`}
        description={`This quotation has been ${quotation.status.toLowerCase()}. Create a new one instead of changing a document the customer has already responded to.`}
        action={
          <Button as={Link} to={`/quotations/${quotation.id}`} size="sm">
            View quotation
          </Button>
        }
      />
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const result = builder.validate()
    setErrors(result.errors)
    setLineErrors(result.lineErrors)
    if (!result.isValid) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const payload = builder.toPayload()
      const saved = isEdit
        ? await updateQuotation(quotationId, payload)
        : await createQuotation(payload)

      toast.success(isEdit ? 'Quotation updated' : 'Quotation generated', {
        description: `${saved.id} · ${formatRupees(saved.finalAmount)}`,
      })
      navigate(`/quotations/${saved.id}`)
    } catch (caught) {
      setSubmitError(caught)
      setIsSubmitting(false)
    }
  }

  const { totals } = builder

  return (
    <form onSubmit={handleSubmit} className="pb-8">
      <PageHeader
        description={
          isEdit
            ? `Editing ${quotation?.id}. Saving re-prices every line from the current catalogue.`
            : 'Select a customer, then the products and packages to quote.'
        }
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button size="sm" type="submit" isLoading={isSubmitting}>
              {isEdit ? 'Save changes' : 'Generate quotation'}
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

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="grid gap-5 lg:col-span-2">
          <ApiErrorAlert error={submitError} fallback="Could not save the quotation." />

          <QuotationCustomerSection builder={builder} errors={errors} />

          {/* ── Line items ────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle>What you&apos;re quoting</CardTitle>
              <span className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => builder.addLine('catalogue')}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  From catalogue
                </Button>
                {/* Equal billing with the catalogue button on purpose: bespoke
                    work is a large share of what gets sold here, and burying it
                    behind a menu would say otherwise. */}
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => builder.addLine('custom')}
                >
                  <Wrench className="size-4" aria-hidden="true" />
                  Custom item
                </Button>
              </span>
            </CardHeader>

            <CardContent className="grid gap-4">
              {builder.lines.map((line, index) => (
                <QuotationLineItem
                  key={line.key}
                  line={line}
                  index={index}
                  lineError={lineErrors[index] ?? {}}
                  builder={builder}
                  // The API requires at least one line item.
                  canRemove={builder.lines.length > 1}
                />
              ))}
            </CardContent>
          </Card>

          {/* ── Terms ─────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Terms</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Textarea
                label="Payment terms"
                value={builder.values.paymentTerms}
                onChange={(event) =>
                  builder.setValue('paymentTerms', event.target.value)
                }
                rows={2}
                hint="Copied from company settings. Edits apply to this quotation only."
              />
              <Textarea
                label="Terms &amp; conditions"
                value={builder.values.termsConditions}
                onChange={(event) =>
                  builder.setValue('termsConditions', event.target.value)
                }
                rows={10}
                hint="One clause per line."
              />
              <Textarea
                label="Notes"
                value={builder.values.notes}
                onChange={(event) => builder.setValue('notes', event.target.value)}
                rows={2}
                hint="Optional. Printed under the package table."
              />
            </CardContent>
          </Card>
        </div>

        {/* ── Running total ───────────────────────────── */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Input
                label="Discount"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={builder.values.discountPercent}
                onChange={(event) =>
                  builder.setValue('discountPercent', event.target.value)
                }
                error={errors.discountPercent}
                hint="Percentage of the total."
              />

              <dl className="grid gap-1.5 border-t border-line pt-3 text-sm">
                {/* Broken out only when there is one, so a quotation with no
                    setup charge is not padded with a zero row. */}
                {totals.installationTotal > 0 && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-ink-muted">Recurring</dt>
                      <dd className="tabular-nums text-ink">
                        {formatRupees(totals.serviceTotal)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-muted">One-off setup</dt>
                      <dd className="tabular-nums text-ink">
                        {formatRupees(totals.installationTotal)}
                      </dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Total</dt>
                  <dd className="tabular-nums text-ink">
                    {formatRupees(totals.totalAmount)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-muted">
                    Discount {totals.discountPercent > 0 && `(${totals.discountPercent}%)`}
                  </dt>
                  <dd className="tabular-nums text-ink-muted">
                    −{formatRupees(totals.discount)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-line pt-1.5">
                  <dt className="font-semibold text-ink">Grand total</dt>
                  <dd className="font-semibold tabular-nums text-ink">
                    {formatRupees(totals.finalAmount)}
                  </dd>
                </div>
              </dl>

              {/* The server recomputes all of this and its numbers win — a
                  client that could set its own total could quote any price. */}
              <p className="text-xs text-ink-subtle">
                A preview. Final amounts are calculated by the server when you save.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  )
}
