import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { History } from 'lucide-react'
import { ApiErrorAlert } from '@/components/common'
import { Button, Input, MoneyInput, Modal, Select, Textarea } from '@/components/ui'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDate } from '@/lib/format'
import { createLead, listLeads } from '../api'
import { useLookups } from '../hooks'
import { SOURCE_OPTIONS } from '../constants'
import { LeadStatusBadge } from './LeadBadges'

/**
 * Capture an incoming enquiry.
 *
 * Only the name and the number are required, and that is the whole design
 * point: the process starts with "we receive contact numbers", so a form that
 * insisted on a company and an email would either block the capture or teach
 * people to type "n/a" into three boxes. Everything else is learned on the
 * first call and filled in from the lead's own page afterwards.
 *
 * The server always starts a lead at "New", so there is no stage picker here.
 */

/** Below this there is not enough of a number to look anything up. */
const MIN_LOOKUP_DIGITS = 7

const INITIAL_VALUES = {
  contactName: '',
  phone: '',
  companyName: '',
  email: '',
  source: 'Phone',
  ownerId: '',
  nextFollowUpOn: '',
  estimatedValue: '',
  requirementSummary: '',
}

function validate(values) {
  const errors = {}

  if (values.contactName.trim().length < 2) {
    errors.contactName = 'Enter the name of the person who got in touch.'
  }

  // Mirrors the server's rule (7–15 digits) so the common mistake is caught
  // without a round trip. The server re-checks regardless.
  const digits = values.phone.replace(/\D/g, '')
  if (digits.length < MIN_LOOKUP_DIGITS || digits.length > 15) {
    errors.phone = 'Enter a contact number with 7 to 15 digits.'
  }

  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address, or leave it blank.'
  }

  return errors
}

/**
 * "We have spoken to this number before."
 *
 * The schema has carried an index on `phone` from the beginning, with a comment
 * saying it exists so the intake form can warn about a returning caller without
 * a table scan — and nothing had ever used it. The number is deliberately not
 * unique, because the same person genuinely does come back months later as a
 * fresh enquiry, so this informs rather than blocks: the rep decides whether
 * they are looking at a new deal or the one already in the pipeline.
 *
 * Matching is on digits alone, which is what makes it work at all — the stored
 * number could be "+94 77 123 4567" and the typed one "0771234567".
 */
function DuplicateWarning({ leads }) {
  return (
    <div className="rounded-lg bg-warning-soft px-3 py-2.5 text-sm text-warning-strong">
      <p className="flex items-center gap-2 font-medium">
        <History className="size-4 shrink-0" aria-hidden="true" />
        We have spoken to this number before
      </p>

      <ul className="mt-2 space-y-1.5">
        {leads.map((lead) => (
          <li key={lead.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              to={`/leads/${lead.id}`}
              className="font-medium underline underline-offset-2 hover:no-underline"
            >
              {lead.contactName}
            </Link>
            <LeadStatusBadge status={lead.status} size="sm" />
            <span className="text-xs opacity-80">
              captured {formatDate(lead.createdAt)}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs opacity-90">
        Carry on if this is a new enquiry — the same number coming back is normal.
      </p>
    </div>
  )
}

/**
 * @param {object} props
 * @param {() => void} props.onClose
 * @param {(lead: object) => void} props.onCreated
 */
export function CaptureLeadModal({ onClose, onCreated }) {
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  /** The last lookup that came back, tagged with the number it was for. */
  const [lookup, setLookup] = useState({ digits: '', leads: [] })

  const { owners } = useLookups({ owners: true })

  const digits = values.phone.replace(/\D/g, '')
  const lookupDigits = useDebouncedValue(digits, 400)

  useEffect(() => {
    if (lookupDigits.length < MIN_LOOKUP_DIGITS) return undefined

    let ignore = false

    listLeads({ query: lookupDigits, perPage: 3 })
      .then((result) => {
        if (!ignore) setLookup({ digits: lookupDigits, leads: result.data })
      })
      // A failed lookup must not disturb the capture. The warning is a
      // courtesy; recording the enquiry is the job.
      .catch(() => {
        if (!ignore) setLookup({ digits: lookupDigits, leads: [] })
      })

    return () => {
      ignore = true
    }
  }, [lookupDigits])

  /**
   * Only shown while the result still describes the number in the box.
   *
   * Deriving this rather than clearing the state means editing the number
   * hides a stale warning immediately — no effect, no render cascade, and no
   * window where the form warns about a number the user has already changed.
   */
  const duplicates = lookup.digits === digits ? lookup.leads : []

  const setValue = (key) => (event) => {
    const { value } = event.target
    setValues((current) => ({ ...current, [key]: value }))
    // Clear the field's error as soon as it is touched, so the form stops
    // shouting about something the user is already fixing.
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const found = validate(values)
    setErrors(found)
    if (Object.values(found).some(Boolean)) return

    setIsSaving(true)
    setSubmitError(null)

    try {
      onCreated(await createLead(values))
    } catch (error) {
      setSubmitError(error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Capture a lead"
      description="A name and a contact number are enough to start. The rest can wait for the first call."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="capture-lead-form"
            isLoading={isSaving}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Capture lead'}
          </Button>
        </>
      }
    >
      <form id="capture-lead-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {submitError && <ApiErrorAlert error={submitError} />}

        {duplicates.length > 0 && <DuplicateWarning leads={duplicates} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Contact name"
            value={values.contactName}
            onChange={setValue('contactName')}
            error={errors.contactName}
            placeholder="Who got in touch?"
            required
            autoFocus
          />

          <Input
            label="Contact number"
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={setValue('phone')}
            error={errors.phone}
            placeholder="+94 77 123 4567"
            hint="Stored as you type it; searchable either way."
            required
          />

          <Input
            label="Company"
            value={values.companyName}
            onChange={setValue('companyName')}
            placeholder="Optional"
          />

          <Input
            label="Email"
            type="email"
            value={values.email}
            onChange={setValue('email')}
            error={errors.email}
            placeholder="Optional"
          />

          <Select
            label="How did they reach us?"
            value={values.source}
            onChange={setValue('source')}
            options={SOURCE_OPTIONS}
          />

          <Select
            label="Owner"
            value={values.ownerId}
            onChange={setValue('ownerId')}
            options={owners}
            placeholder="Assign to me"
            hint="Defaults to you if left unset."
          />

          <Input
            label="Follow up on"
            type="date"
            value={values.nextFollowUpOn}
            onChange={setValue('nextFollowUpOn')}
            hint="When did you promise to call back?"
          />

          <MoneyInput
            label="Estimated value"
            value={values.estimatedValue}
            onChange={setValue('estimatedValue')}
            placeholder="0.00"
            hint="A rough figure is fine."
          />
        </div>

        <Textarea
          label="What are they after?"
          value={values.requirementSummary}
          onChange={setValue('requirementSummary')}
          placeholder="Whatever they told you on the first call. Individual requirements can be itemised later."
          rows={3}
        />
      </form>
    </Modal>
  )
}
