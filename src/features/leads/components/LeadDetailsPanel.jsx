import { useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { ApiErrorAlert } from '@/components/common'
import {
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
import { formatDate, formatRupees } from '@/lib/format'
import { updateLead } from '../api'
import {
  LEAD_SOURCE,
  SOLUTION_TYPE_OPTIONS,
  SOURCE_OPTIONS,
  followUpUrgency,
} from '../constants'
import { SolutionTypeBadge } from './LeadBadges'

/**
 * The lead's own fields — read as a summary, edited in place.
 *
 * Status is deliberately absent. It moves through the stage control and the
 * close/convert actions on the page above, so all the bookkeeping that hangs
 * off a stage change (closed_at, lost_reason, the customer record) lives in
 * one path rather than being reachable from an ordinary edit form too.
 *
 * The product picker only appears when the solution type is "Existing
 * Product", and the scope box only when it is "Custom Development": asking
 * which product covers a bespoke build is a question with no answer.
 */

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <dt className="shrink-0 text-sm text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-ink">{children}</dd>
    </div>
  )
}

const EMPTY = <span className="text-ink-subtle">—</span>

function ReadView({ lead }) {
  const urgency = followUpUrgency(lead.nextFollowUpOn)

  return (
    <dl className="divide-y divide-line">
      <Row label="Phone">
        <a href={`tel:${lead.phone.replace(/\s/g, '')}`} className="hover:text-brand-700">
          {lead.phone}
        </a>
      </Row>
      <Row label="Email">
        {lead.email ? (
          <a href={`mailto:${lead.email}`} className="truncate hover:text-brand-700">
            {lead.email}
          </a>
        ) : (
          EMPTY
        )}
      </Row>
      <Row label="Company">{lead.companyName || EMPTY}</Row>
      <Row label="Source">{LEAD_SOURCE[lead.source]?.label ?? lead.source}</Row>
      <Row label="Owner">{lead.owner?.name ?? <span className="text-ink-subtle">Unassigned</span>}</Row>
      <Row label="Solution">
        <SolutionTypeBadge solutionType={lead.solutionType} size="sm" />
      </Row>
      {lead.interestedProduct && (
        <Row label="Product">{lead.interestedProduct.name}</Row>
      )}
      <Row label="Estimated value">
        {lead.estimatedValue == null ? EMPTY : formatRupees(lead.estimatedValue)}
      </Row>
      <Row label="Next follow-up">
        {lead.nextFollowUpOn ? (
          <span className="flex flex-col items-end gap-0.5">
            <time dateTime={lead.nextFollowUpOn}>{formatDate(lead.nextFollowUpOn)}</time>
            {urgency && (
              <span
                className={
                  urgency.tone === 'danger' ? 'text-xs text-danger-strong' : 'text-xs text-warning-strong'
                }
              >
                {urgency.label}
              </span>
            )}
          </span>
        ) : (
          <span className="text-ink-subtle italic">Not scheduled</span>
        )}
      </Row>
      <Row label="Captured">{formatDate(lead.createdAt)}</Row>
    </dl>
  )
}

/**
 * @param {object} props
 * @param {object} props.lead
 * @param {Array} props.owners
 * @param {Array} props.products
 * @param {boolean} props.canManage
 * @param {(lead: object) => void} props.onChange
 */
export function LeadDetailsPanel({ lead, owners, products, canManage, onChange }) {
  const [isEditing, setIsEditing] = useState(false)
  const [values, setValues] = useState(null)
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const startEditing = () => {
    setValues({
      contactName: lead.contactName,
      phone: lead.phone,
      email: lead.email,
      companyName: lead.companyName,
      source: lead.source,
      solutionType: lead.solutionType,
      interestedProductId: lead.interestedProduct?.id ?? '',
      customScope: lead.customScope,
      requirementSummary: lead.requirementSummary,
      estimatedValue: lead.estimatedValue ?? '',
      ownerId: lead.owner?.id ?? '',
      nextFollowUpOn: lead.nextFollowUpOn ?? '',
    })
    setError(null)
    setIsEditing(true)
  }

  const setValue = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      onChange(await updateLead(lead.id, values))
      setIsEditing(false)
    } catch (caught) {
      setError(caught)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle as="h2" className="text-sm">
          Details
        </CardTitle>

        {canManage &&
          (isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
            >
              <X className="size-4" aria-hidden="true" />
              Cancel
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={startEditing}>
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit
            </Button>
          ))}
      </CardHeader>

      <CardContent>
        {!isEditing ? (
          <ReadView lead={lead} />
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <ApiErrorAlert error={error} />}

            <Input
              label="Contact name"
              value={values.contactName}
              onChange={setValue('contactName')}
              required
            />
            <Input
              label="Phone"
              type="tel"
              value={values.phone}
              onChange={setValue('phone')}
              required
            />
            <Input
              label="Email"
              type="email"
              value={values.email}
              onChange={setValue('email')}
            />
            <Input
              label="Company"
              value={values.companyName}
              onChange={setValue('companyName')}
            />
            <Select
              label="Source"
              value={values.source}
              onChange={setValue('source')}
              options={SOURCE_OPTIONS}
            />
            <Select
              label="Owner"
              value={values.ownerId}
              onChange={setValue('ownerId')}
              options={owners}
              placeholder="Unassigned"
            />

            <Select
              label="Solution"
              value={values.solutionType}
              onChange={setValue('solutionType')}
              options={SOLUTION_TYPE_OPTIONS}
              hint="The requirements panel suggests this; you decide it."
            />

            {values.solutionType === 'Existing Product' && (
              <Select
                label="Which product?"
                value={values.interestedProductId}
                onChange={setValue('interestedProductId')}
                options={products}
                placeholder="Not chosen yet"
              />
            )}

            {values.solutionType === 'Custom Development' && (
              <Textarea
                label="Proposed scope"
                value={values.customScope}
                onChange={setValue('customScope')}
                placeholder="What we would build, in enough detail to estimate it."
                rows={4}
              />
            )}

            <MoneyInput
              label="Estimated value"
              value={values.estimatedValue}
              onChange={setValue('estimatedValue')}
              placeholder="0.00"
            />

            <Input
              label="Next follow-up"
              type="date"
              value={values.nextFollowUpOn}
              onChange={setValue('nextFollowUpOn')}
            />

            <Textarea
              label="Requirement notes"
              value={values.requirementSummary}
              onChange={setValue('requirementSummary')}
              placeholder="Free-text capture from the calls."
              rows={3}
            />

            <Button type="submit" fullWidth disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
