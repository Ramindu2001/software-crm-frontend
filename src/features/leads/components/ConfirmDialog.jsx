import { Button, Modal } from '@/components/ui'

/**
 * "Are you sure?" for the one action in this module that cannot be undone.
 *
 * Deleting a requirement is a hard delete — there is no archive flag and no
 * restore endpoint — and it sat behind a single unguarded icon button, in a row
 * of controls a user is otherwise clicking freely to assess things. Every other
 * destructive action in the app confirms; this brings it into line.
 *
 * Local to the leads feature rather than promoted into components/ui: one
 * caller is not yet a pattern, and a shared confirm dialog wants a considered
 * API (async handlers, loading state, focus return) rather than whatever the
 * first caller happened to need.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.description
 * @param {string} [props.confirmLabel]
 * @param {boolean} [props.isBusy]
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onClose
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Delete',
  isBusy = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isBusy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isBusy}>
            {isBusy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      {/* The description carries the message; the body stays empty so the
          dialog is as small as the decision it is asking for. */}
      <span className="sr-only">{description}</span>
    </Modal>
  )
}
