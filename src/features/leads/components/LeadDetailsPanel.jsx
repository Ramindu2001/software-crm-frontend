import { useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
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
  Spinner,
} from '@/components/ui'
import { cn } from '@/lib/utils'
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
 * The lead's own fields — read as a summary, edited one at a time.
 *
 * ── What changed, and why ──
 * Editing used to be all-or-nothing: pressing Edit swapped the entire read view
 * for a twelve-field form. Changing a follow-up date — far and away the most
 * common edit — meant being handed the contact name, phone, email, company,
 * source, owner, solution type, product, value and two textareas, then hunting
 * for the one field you came for and submitting the lot. Every save also sent
 * all twelve columns, so an unrelated field mid-edit could be clobbered by a
 * stale value.
 *
 * Now each row edits itself. One field, one request, one thing that can change.
 *
 * Status is deliberately absent, as before. It moves through the stepper and
 * the close/convert actions on the page above, so all the bookkeeping that
 * hangs off a stage change (closed_at, lost_reason, the customer record) lives
 * in one path rather than being reachable from an ordinary edit form too.
 */

const EMPTY = <span className="text-ink-subtle">—</span>

/** Builds the row definitions from the current lead. */
function buildFields({ lead, owners, products }) {
  const urgency = followUpUrgency(lead.nextFollowUpOn)

  const fields = [
    {
      key: 'contactName',
      label: 'Contact name',
      control: 'text',
      value: lead.contactName,
      display: lead.contactName,
    },
    {
      key: 'phone',
      label: 'Phone',
      control: 'tel',
      value: lead.phone,
      display: (
        <a
          href={`tel:${lead.phone.replace(/\s/g, '')}`}
          className="hover:text-brand-700"
        >
          {lead.phone}
        </a>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      control: 'email',
      value: lead.email,
      display: lead.email ? (
        <a href={`mailto:${lead.email}`} className="truncate hover:text-brand-700">
          {lead.email}
        </a>
      ) : (
        EMPTY
      ),
    },
    {
      key: 'companyName',
      label: 'Company',
      control: 'text',
      value: lead.companyName,
      display: lead.companyName || EMPTY,
    },
    {
      key: 'source',
      label: 'Source',
      control: 'select',
      options: SOURCE_OPTIONS,
      value: lead.source,
      display: LEAD_SOURCE[lead.source]?.label ?? lead.source,
    },
    {
      key: 'ownerId',
      label: 'Owner',
      control: 'select',
      options: owners,
      placeholder: 'Unassigned',
      value: lead.owner?.id ?? '',
      display: lead.owner?.name ?? <span className="text-ink-subtle">Unassigned</span>,
    },
    {
      key: 'solutionType',
      label: 'Solution',
      control: 'select',
      options: SOLUTION_TYPE_OPTIONS,
      value: lead.solutionType,
      display: <SolutionTypeBadge solutionType={lead.solutionType} size="sm" />,
      hint: 'The requirements panel suggests this; you decide it.',
    },
  ]

  // Asking which product covers a bespoke build is a question with no answer,
  // so the picker only exists on the path where it means something.
  if (lead.solutionType === 'Existing Product') {
    fields.push({
      key: 'interestedProductId',
      label: 'Product',
      control: 'select',
      options: products,
      placeholder: 'Not chosen yet',
      value: lead.interestedProduct?.id ?? '',
      display: lead.interestedProduct?.name ?? EMPTY,
    })
  }

  fields.push(
    {
      key: 'estimatedValue',
      label: 'Estimated value',
      control: 'money',
      value: lead.estimatedValue ?? '',
      display: lead.estimatedValue == null ? EMPTY : formatRupees(lead.estimatedValue),
    },
    {
      key: 'nextFollowUpOn',
      label: 'Next follow-up',
      control: 'date',
      value: lead.nextFollowUpOn ?? '',
      display: lead.nextFollowUpOn ? (
        <span className="flex flex-col items-end gap-0.5">
          <time dateTime={lead.nextFollowUpOn}>{formatDate(lead.nextFollowUpOn)}</time>
          {urgency && (
            <span
              className={cn(
                'text-xs',
                urgency.tone === 'danger'
                  ? 'text-danger-strong'
                  : 'text-warning-strong',
              )}
            >
              {urgency.label}
            </span>
          )}
        </span>
      ) : (
        <span className="text-ink-subtle italic">Not scheduled</span>
      ),
    },
  )

  return fields
}

function EditControl({ field, value, onChange, onCommit, onCancel }) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && field.control !== 'select') {
      event.preventDefault()
      onCommit()
    }
    if (event.key === 'Escape') onCancel()
  }

  const shared = {
    value,
    onChange: (event) => onChange(event.target.value),
    onKeyDown: handleKeyDown,
    'aria-label': field.label,
    autoFocus: true,
  }

  if (field.control === 'select') {
    return <Select {...shared} options={field.options} placeholder={field.placeholder} />
  }

  if (field.control === 'money') {
    return <MoneyInput {...shared} placeholder="0.00" />
  }

  return <Input {...shared} type={field.control} />
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
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  const fields = buildFields({ lead, owners, products })

  const startEdit = (field) => {
    setEditing(field.key)
    setDraft(field.value ?? '')
    setError(null)
  }

  const cancel = () => {
    setEditing(null)
    setError(null)
  }

  const commit = async (field) => {
    // Nothing typed, nothing to send — and a no-op PUT would come back 400
    // ("no fields to update") for a user who simply changed their mind.
    if (String(draft ?? '') === String(field.value ?? '')) {
      cancel()
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      onChange(await updateLead(lead.id, { [field.key]: draft }))
      setEditing(null)
    } catch (caught) {
      setError(caught)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-sm">
          Details
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {error && <ApiErrorAlert error={error} />}

        <dl className="divide-y divide-line">
          {fields.map((field) => {
            const isEditing = editing === field.key

            if (isEditing) {
              return (
                <div key={field.key} className="flex flex-col gap-2 py-3">
                  <dt className="text-sm font-medium text-ink">{field.label}</dt>
                  <dd className="flex flex-col gap-2">
                    <EditControl
                      field={field}
                      value={draft}
                      onChange={setDraft}
                      onCommit={() => commit(field)}
                      onCancel={cancel}
                    />
                    {field.hint && (
                      <p className="text-xs text-ink-muted">{field.hint}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => commit(field)}
                        isLoading={isSaving}
                        disabled={isSaving}
                      >
                        {!isSaving && <Check className="size-4" aria-hidden="true" />}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancel}
                        disabled={isSaving}
                      >
                        <X className="size-4" aria-hidden="true" />
                        Cancel
                      </Button>
                    </div>
                  </dd>
                </div>
              )
            }

            return (
              <div
                key={field.key}
                className="group flex items-start justify-between gap-3 py-2.5"
              >
                <dt className="shrink-0 text-sm text-ink-muted">{field.label}</dt>
                <dd className="flex min-w-0 items-start gap-1 text-right text-sm text-ink">
                  <span className="min-w-0">{field.display}</span>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => startEdit(field)}
                      aria-label={`Edit ${field.label}`}
                      // Revealed on hover for pointer users, but always present
                      // for keyboard focus — an action that only exists on hover
                      // does not exist for anybody navigating by Tab.
                      className="-my-0.5 shrink-0 rounded p-1 text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-ink"
                    >
                      <Pencil className="size-3" aria-hidden="true" />
                    </button>
                  )}
                </dd>
              </div>
            )
          })}

          <div className="flex items-start justify-between gap-3 py-2.5">
            <dt className="shrink-0 text-sm text-ink-muted">Captured</dt>
            <dd className="text-right text-sm text-ink">{formatDate(lead.createdAt)}</dd>
          </div>
        </dl>

        {isSaving && (
          <p className="flex items-center gap-2 text-xs text-ink-muted">
            <Spinner className="size-3" />
            Saving…
          </p>
        )}
      </CardContent>
    </Card>
  )
}
