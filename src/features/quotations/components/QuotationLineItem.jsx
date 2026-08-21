import { useState } from 'react'
import { Plus, Trash2, Wrench, X } from 'lucide-react'
import { Badge, Button, Input, MoneyInput, Select, Textarea } from '@/components/ui'
import { formatRupees } from '@/lib/format'
import { PLAN, PLAN_OPTIONS } from '../constants'

/**
 * One line of a quotation, in whichever of the two shapes it is.
 *
 * ── Catalogue vs custom ──
 * A catalogue line points at a product and a package, and everything about it —
 * price, renewal, features, requirements — is looked up and copied from the
 * catalogue. A custom line describes work that is not in the catalogue and
 * carries all of that on its own face, because there is nothing to look it up
 * from.
 *
 * They are one component rather than two because they occupy the same slot in
 * the same list and share quantity, plan and the running line total. Splitting
 * them would duplicate that half and invite the two to drift apart visually,
 * which on a document builder matters more than usual.
 *
 * The custom form is deliberately the fuller one: a catalogue line gets its
 * meaning from a product record the reader can go and look at, while a bespoke
 * line has to explain itself on the page.
 */

/** The bullet list printed for a custom line. */
function FeatureEditor({ features, onChange, disabled }) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const value = draft.trim()
    if (!value || features.includes(value)) {
      setDraft('')
      return
    }
    onChange([...features, value])
    setDraft('')
  }

  return (
    <div className="sm:col-span-2">
      <span className="mb-1.5 block text-sm font-medium text-ink">
        What&apos;s included
      </span>

      {features.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {features.map((feature) => (
            <li key={feature}>
              <span className="inline-flex items-center gap-1 rounded-full bg-sunken py-1 pr-1 pl-2.5 text-xs text-ink">
                {feature}
                <button
                  type="button"
                  onClick={() => onChange(features.filter((f) => f !== feature))}
                  aria-label={`Remove "${feature}"`}
                  className="grid size-4 place-items-center rounded-full text-ink-subtle transition-colors hover:bg-danger-soft hover:text-danger-strong"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          // Enter would otherwise submit the whole quotation form.
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            add()
          }}
          placeholder="e.g. Two-day on-site training"
          aria-label="Add an included item"
          disabled={disabled}
          wrapperClassName="flex-1"
        />
        <Button type="button" variant="secondary" onClick={add} disabled={disabled || !draft.trim()}>
          <Plus className="size-4" aria-hidden="true" />
          Add
        </Button>
      </div>
      <p className="mt-1.5 text-xs text-ink-muted">
        Optional. Printed as the bullet list under the package table — the same
        place a catalogue product&apos;s features appear.
      </p>
    </div>
  )
}

function CustomFields({ line, lineError, onUpdate }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Input
        label="What are you quoting?"
        value={line.productName}
        onChange={(event) => onUpdate({ productName: event.target.value })}
        error={lineError.productName}
        placeholder="e.g. Custom stock-transfer module"
        wrapperClassName="sm:col-span-2"
        required
      />

      <Textarea
        label="Description"
        value={line.description}
        onChange={(event) => onUpdate({ description: event.target.value })}
        rows={3}
        placeholder="What the work covers, in enough detail that the customer knows what they are agreeing to."
        hint="Printed beneath the line. This is where bespoke work explains itself."
        wrapperClassName="sm:col-span-2"
      />

      <Input
        label="Label"
        value={line.packageName}
        onChange={(event) => onUpdate({ packageName: event.target.value })}
        placeholder="e.g. Phase 1"
        hint="Optional. Sits where a package name would."
      />

      <Select
        label="Billing"
        value={line.plan}
        onChange={(event) => onUpdate({ plan: event.target.value })}
        options={PLAN_OPTIONS}
        hint="One-off work is normally left as Annual."
      />

      <Input
        label="Quantity"
        type="number"
        min="1"
        step="1"
        value={line.quantity}
        onChange={(event) => onUpdate({ quantity: event.target.value })}
        error={lineError.quantity}
      />

      <MoneyInput
        label="Price"
        value={line.unitPrice}
        onChange={(event) => onUpdate({ unitPrice: event.target.value })}
        error={lineError.unitPrice}
        placeholder="0.00"
        // Required here, unlike a catalogue line, because nothing else can
        // price this: there is no package fee to fall back to.
        hint="Per unit. Nothing in the catalogue prices this, so it is required."
        required
      />

      <MoneyInput
        label="One-off setup fee"
        value={line.installationFee}
        onChange={(event) => onUpdate({ installationFee: event.target.value })}
        error={lineError.installationFee}
        placeholder="0.00"
        hint="Optional. Charged once, whatever the quantity."
        wrapperClassName="sm:col-span-2"
      />

      <FeatureEditor
        features={line.features}
        onChange={(features) => onUpdate({ features })}
      />
    </div>
  )
}

function CatalogueFields({ line, lineError, builder, onUpdate }) {
  const product = builder.getProductDetail(line.productId)
  const pkg = builder.getPackage(line)
  const listPrice = builder.listPriceFor(line)

  const packageOptions = (product?.packages ?? []).map((entry) => ({
    value: String(entry.id),
    label: entry.name,
  }))

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Product / service"
          value={line.productId}
          onChange={(event) => onUpdate({ productId: event.target.value })}
          options={builder.products}
          error={lineError.productId}
          disabled={builder.isLoadingOptions}
          placeholder="Select a product"
        />

        <Select
          label="Package"
          value={line.packageId}
          onChange={(event) => onUpdate({ packageId: event.target.value })}
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
          onChange={(event) => onUpdate({ plan: event.target.value })}
          options={PLAN_OPTIONS}
          hint={PLAN[line.plan]?.description}
        />

        <Input
          label="Quantity"
          type="number"
          min="1"
          step="1"
          value={line.quantity}
          onChange={(event) => onUpdate({ quantity: event.target.value })}
          error={lineError.quantity}
        />

        <MoneyInput
          label="Unit price"
          value={line.unitPrice}
          onChange={(event) => onUpdate({ unitPrice: event.target.value })}
          error={lineError.unitPrice}
          placeholder={pkg ? String(listPrice) : ''}
          // Blank tracks the package price; a value is an explicit negotiated
          // override.
          hint={
            pkg
              ? `Package price ${formatRupees(listPrice)} — leave blank to use it`
              : 'Set by the package once one is chosen'
          }
          wrapperClassName="sm:col-span-2"
        />
      </div>

      {/* What the customer will see for this line, loaded from the package the
          moment it is chosen. */}
      {pkg && (
        <div className="mt-3 grid gap-2 rounded-md border border-line bg-surface p-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
    </>
  )
}

/**
 * @param {object} props
 * @param {object} props.line
 * @param {number} props.index
 * @param {object} props.lineError
 * @param {object} props.builder
 * @param {boolean} props.canRemove
 */
export function QuotationLineItem({ line, index, lineError, builder, canRemove }) {
  const isCustom = line.kind === 'custom'
  const onUpdate = (patch) => builder.updateLine(line.key, patch)

  const price = builder.effectivePrice(line)
  const installation = builder.installationFeeFor(line)
  const lineTotal = price * (Number(line.quantity) || 0)

  return (
    <div className="relative rounded-lg border border-line bg-sunken/40 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            Item {index + 1}
          </span>
          {isCustom && (
            <Badge tone="brand" size="sm">
              <Wrench className="size-3" aria-hidden="true" />
              Custom
            </Badge>
          )}
        </span>

        <button
          type="button"
          onClick={() => builder.removeLine(line.key)}
          disabled={!canRemove}
          className="rounded p-1.5 text-ink-subtle transition-colors hover:bg-danger-soft hover:text-danger-strong disabled:opacity-40"
          aria-label={`Remove item ${index + 1}`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      {isCustom ? (
        <CustomFields line={line} lineError={lineError} onUpdate={onUpdate} />
      ) : (
        <CatalogueFields
          line={line}
          lineError={lineError}
          builder={builder}
          onUpdate={onUpdate}
        />
      )}

      {/* Shown for both kinds, so the two read the same way down the list.
          Installation is called out separately because it is charged once
          rather than per unit, which the line total alone would not convey. */}
      {(lineTotal > 0 || installation > 0) && (
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2.5 text-xs">
          <span className="text-ink-muted">
            Line total{' '}
            <span className="font-medium text-ink tabular-nums">
              {formatRupees(lineTotal)}
            </span>
          </span>
          {installation > 0 && (
            <span className="text-ink-muted">
              + one-off setup{' '}
              <span className="font-medium text-ink tabular-nums">
                {formatRupees(installation)}
              </span>
            </span>
          )}
        </p>
      )}
    </div>
  )
}
