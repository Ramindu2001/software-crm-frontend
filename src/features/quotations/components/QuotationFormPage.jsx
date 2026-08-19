import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, ShieldAlert, Trash2, TriangleAlert } from 'lucide-react'
import { ApiErrorAlert, EmptyState, PageHeader, RouteFallback } from '@/components/common'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  MoneyInput,
  Select,
  Textarea,
} from '@/components/ui'
import { PERMISSIONS, useAuth } from '@/features/auth'
import { useCompanySettings } from '@/features/company'
import { formatRupees } from '@/lib/format'
import { toast } from '@/lib/toastStore'
import { createQuotation, updateQuotation } from '../api'
import { useQuotation, useQuotationBuilder } from '../hooks'
import { isEditable, PLAN, PLAN_OPTIONS } from '../constants'

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

          {/* ── Customer ──────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                label="Customer"
                value={builder.values.customerId}
                onChange={(event) => builder.setValue('customerId', event.target.value)}
                options={builder.customers}
                error={errors.customerId}
                disabled={builder.isLoadingOptions}
                placeholder={
                  builder.isLoadingOptions ? 'Loading…' : 'Select a customer'
                }
                required
              />
              <p className="mt-1.5 text-xs text-ink-muted">
                Their contact person, phone, address and email are pulled onto the
                quotation automatically.
              </p>
            </CardContent>
          </Card>

          {/* ── Line items ────────────────────────────── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Products &amp; packages</CardTitle>
              <Button type="button" size="sm" variant="secondary" onClick={builder.addLine}>
                <Plus className="mr-1.5 size-4" aria-hidden="true" />
                Add item
              </Button>
            </CardHeader>

            <CardContent className="grid gap-4">
              {builder.lines.map((line, index) => {
                const product = builder.getProductDetail(line.productId)
                const pkg = builder.getPackage(line)
                const lineError = lineErrors[index] ?? {}
                const listPrice = builder.listPriceFor(line)
                const price = builder.effectivePrice(line)

                const packageOptions = (product?.packages ?? []).map((entry) => ({
                  value: String(entry.id),
                  label: entry.name,
                }))

                return (
                  <div
                    key={line.key}
                    className="relative rounded-lg border border-line bg-sunken/40 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                        Item {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => builder.removeLine(line.key)}
                        disabled={builder.lines.length === 1}
                        className="rounded p-1.5 text-ink-subtle transition-colors hover:bg-danger-soft hover:text-danger-strong disabled:opacity-40"
                        aria-label={`Remove item ${index + 1}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        label="Product / service"
                        value={line.productId}
                        onChange={(event) =>
                          builder.updateLine(line.key, { productId: event.target.value })
                        }
                        options={builder.products}
                        error={lineError.productId}
                        disabled={builder.isLoadingOptions}
                        placeholder="Select a product"
                      />

                      <Select
                        label="Package"
                        value={line.packageId}
                        onChange={(event) =>
                          builder.updateLine(line.key, { packageId: event.target.value })
                        }
                        options={packageOptions}
                        error={lineError.packageId}
                        // Nothing to choose until the product's packages land.
                        disabled={!product}
                        placeholder={
                          !line.productId
                            ? 'Choose a product first'
                            : !product
                              ? 'Loading packages…'
                              : 'Select a package'
                        }
                      />

                      <Select
                        label="Plan"
                        value={line.plan}
                        onChange={(event) =>
                          builder.updateLine(line.key, { plan: event.target.value })
                        }
                        options={PLAN_OPTIONS}
                        hint={PLAN[line.plan]?.description}
                      />

                      <Input
                        label="Quantity"
                        type="number"
                        min="1"
                        step="1"
                        value={line.quantity}
                        onChange={(event) =>
                          builder.updateLine(line.key, { quantity: event.target.value })
                        }
                        error={lineError.quantity}
                      />

                      <MoneyInput
                        label="Unit price"
                        value={line.unitPrice}
                        onChange={(event) =>
                          builder.updateLine(line.key, { unitPrice: event.target.value })
                        }
                        error={lineError.unitPrice}
                        placeholder={pkg ? String(listPrice) : ''}
                        // Blank tracks the package price; a value is an
                        // explicit negotiated override.
                        hint={
                          pkg
                            ? `Package price ${formatRupees(listPrice)} — leave blank to use it`
                            : 'Set by the package once one is chosen'
                        }
                        wrapperClassName="sm:col-span-2"
                      />
                    </div>

                    {/* What the customer will see for this line, loaded from
                        the package the moment it is chosen. */}
                    {pkg && (
                      <div className="mt-3 grid gap-2 rounded-md border border-line bg-surface p-3 text-xs">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="text-ink-muted">
                            Line total{' '}
                            <span className="font-medium text-ink tabular-nums">
                              {formatRupees(price * (Number(line.quantity) || 0))}
                            </span>
                          </span>
                          <span className="text-ink-muted">
                            Renewal{' '}
                            <span className="font-medium text-ink tabular-nums">
                              {formatRupees(pkg.second_year_price)}
                            </span>
                          </span>
                          <span className="text-ink-muted">
                            Monthly{' '}
                            <span className="font-medium text-ink tabular-nums">
                              {formatRupees(pkg.monthly_price)}
                            </span>
                          </span>
                        </div>

                        {pkg.features?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {pkg.features.map((feature) => (
                              <Badge key={feature} tone="neutral" size="sm">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
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
