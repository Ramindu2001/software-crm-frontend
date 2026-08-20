import { useState } from 'react'
import { ApiErrorAlert } from '@/components/common'
import { Button, Modal, Select, Textarea } from '@/components/ui'
import { updateLeadStatus } from '../api'
import { LOST_REASON_OPTIONS } from '../constants'

/**
 * Close a lead as lost.
 *
 * The reason is mandatory here because it is mandatory on the server — a 422
 * without it — and that is a deliberate piece of discipline rather than an
 * obstacle. A pipeline whose losses are all unexplained answers no question
 * worth asking, and the one this business specifically needs answered is how
 * much work it turns away for want of development capacity. That only becomes
 * countable if the reason is picked at the moment of closing, when the rep
 * still knows it.
 *
 * @param {object} props
 * @param {object} props.lead
 * @param {() => void} props.onClose
 * @param {(lead: object) => void} props.onClosed
 */
export function CloseLeadModal({ lead, onClose, onClosed }) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!reason) return

    setIsSaving(true)
    setError(null)

    try {
      onClosed(
        await updateLeadStatus(lead.id, 'Lost', { lostReason: reason, lostNotes: notes }),
      )
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
      title="Close as lost"
      description={`${lead.id} · ${lead.contactName}. This can be reopened later if they come back.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="close-lead-form"
            variant="danger"
            disabled={isSaving || !reason}
          >
            {isSaving ? 'Saving…' : 'Close as lost'}
          </Button>
        </>
      }
    >
      <form id="close-lead-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <ApiErrorAlert error={error} />}

        <Select
          label="Why did we lose it?"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          options={LOST_REASON_OPTIONS}
          placeholder="Pick a reason"
          required
          autoFocus
        />

        <Textarea
          label="Anything worth remembering?"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional. Budget, timing, who they went with — whatever would help if they come back next year."
          rows={3}
        />
      </form>
    </Modal>
  )
}
