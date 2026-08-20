import { useState } from 'react'
import { ApiErrorAlert } from '@/components/common'
import { Button, Checkbox, Input, Modal, Select, Textarea } from '@/components/ui'
import { logLeadActivity } from '../api'
import { ACTIVITY_TYPE_OPTIONS, OPEN_STATUS_OPTIONS } from '../constants'

/**
 * Log a call — and, in the same breath, say what happens next.
 *
 * Three things become true at the end of a sales call: it happened, the lead
 * has moved (or not), and there is or is not a callback promised. The API
 * takes all three on one request precisely so this dialog can ask for them
 * together. Splitting them into separate actions is how the follow-up date
 * ends up unset, which is the single most common way a lead goes cold.
 *
 * Won and Lost are absent from the stage picker: both need more than a status
 * change (a customer record, or a reason), so each has its own action on the
 * page behind this one.
 *
 * @param {object} props
 * @param {object} props.lead
 * @param {() => void} props.onClose
 * @param {(lead: object) => void} props.onLogged
 */
export function LogActivityModal({ lead, onClose, onLogged }) {
  const [values, setValues] = useState({
    type: 'Call',
    notes: '',
    status: lead.status,
    nextFollowUpOn: lead.nextFollowUpOn ?? '',
  })
  const [clearFollowUp, setClearFollowUp] = useState(false)
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const setValue = (key) => (event) =>
    setValues((current) => ({ ...current, [key]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (values.notes.trim().length === 0) return

    setIsSaving(true)
    setError(null)

    try {
      const updated = await logLeadActivity(lead.id, {
        type: values.type,
        notes: values.notes,
        // Only send a stage when it actually changed, so an unchanged dropdown
        // does not look like a deliberate move in the history.
        status: values.status === lead.status ? undefined : values.status,
        nextFollowUpOn: values.nextFollowUpOn,
        clearFollowUp,
      })
      onLogged(updated)
    } catch (caught) {
      setError(caught)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Log contact"
      description={`What happened with ${lead.contactName}, and what happens next?`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="log-activity-form"
            disabled={isSaving || values.notes.trim().length === 0}
          >
            {isSaving ? 'Saving…' : 'Log it'}
          </Button>
        </>
      }
    >
      <form id="log-activity-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <ApiErrorAlert error={error} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Type"
            value={values.type}
            onChange={setValue('type')}
            options={ACTIVITY_TYPE_OPTIONS}
          />

          <Select
            label="Move to stage"
            value={values.status}
            onChange={setValue('status')}
            options={OPEN_STATUS_OPTIONS}
            hint="Leave as-is if nothing changed."
          />
        </div>

        <Textarea
          label="What was said?"
          value={values.notes}
          onChange={setValue('notes')}
          placeholder="What they asked for, what you promised, anything the next person needs to know."
          rows={4}
          required
          autoFocus
        />

        <div className="flex flex-col gap-3 rounded-lg bg-sunken p-3">
          <Input
            label="Next follow-up"
            type="date"
            value={clearFollowUp ? '' : values.nextFollowUpOn}
            onChange={setValue('nextFollowUpOn')}
            disabled={clearFollowUp}
            hint="An open lead with no date set is the one that gets forgotten."
          />

          <Checkbox
            label="No follow-up needed"
            checked={clearFollowUp}
            onChange={(event) => setClearFollowUp(event.target.checked)}
          />
        </div>
      </form>
    </Modal>
  )
}
