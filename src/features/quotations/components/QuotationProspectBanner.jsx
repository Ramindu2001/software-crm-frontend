import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { ApiErrorAlert } from '@/components/common'
import { Button, Input, Modal, Textarea } from '@/components/ui'
import { linkQuotationCustomer } from '../api'

/**
 * "This was quoted to somebody who isn't a customer yet."
 *
 * ── Why this sits on the quotation ──
 * A quotation can be addressed to a prospect, but an agreement cannot: it is a
 * contract, and every subscription and invoice beneath it is keyed by customer.
 * So there is exactly one step between a won prospect quotation and a signed
 * deal, and this is it. Putting it on the document — rather than making the
 * user go to the customers screen, retype what is already on the page, and come
 * back — is the difference between a workflow and a scavenger hunt.
 *
 * The dialog opens pre-filled from the quotation's own snapshot, so in the
 * common case it is a confirmation rather than a form. `contact_person` and
 * `email` are required here even though the quotation never needed them: that
 * is precisely the promotion being made, from a name on an offer to a company
 * that can be invoiced.
 *
 * Adding them does NOT rewrite the document. The quotation keeps saying what it
 * said when it was sent; this only fills in the link beside it.
 */

function AddCustomerModal({ quotation, onClose, onLinked }) {
  const [values, setValues] = useState({
    // The customers table is NOT NULL on all three. Seeded from the snapshot,
    // so anything already captured is carried across rather than retyped.
    companyName: quotation.customer.name ?? '',
    contactPerson: quotation.customer.contactPerson ?? '',
    email: quotation.customer.email ?? '',
    phone: quotation.customer.phone ?? '',
    address: quotation.customer.address ?? '',
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const setValue = (key) => (event) => {
    const { value } = event.target
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
  }

  const validate = () => {
    const found = {}
    if (!values.companyName.trim()) found.companyName = 'A company name is required.'
    if (!values.contactPerson.trim()) found.contactPerson = 'A contact person is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) {
      found.email = 'A valid email is required to invoice them.'
    }
    return found
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const found = validate()
    setErrors(found)
    if (Object.values(found).some(Boolean)) return

    setIsSaving(true)
    setError(null)

    try {
      onLinked(await linkQuotationCustomer(quotation.id, values))
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
      title="Add as a customer"
      description={`${quotation.customer.name} will be added to your customer list and linked to ${quotation.id}.`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-customer-form"
            isLoading={isSaving}
            disabled={isSaving}
          >
            Add customer
          </Button>
        </>
      }
    >
      <form id="add-customer-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <ApiErrorAlert error={error} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Company name"
            value={values.companyName}
            onChange={setValue('companyName')}
            error={errors.companyName}
            required
          />
          <Input
            label="Contact person"
            value={values.contactPerson}
            onChange={setValue('contactPerson')}
            error={errors.contactPerson}
            required
          />
          <Input
            label="Email"
            type="email"
            value={values.email}
            onChange={setValue('email')}
            error={errors.email}
            hint="Required now — invoices and quotations are emailed."
            required
          />
          <Input
            label="Phone"
            type="tel"
            value={values.phone}
            onChange={setValue('phone')}
          />
          <Textarea
            label="Address"
            value={values.address}
            onChange={setValue('address')}
            rows={2}
            wrapperClassName="sm:col-span-2"
          />
        </div>

        <p className="text-xs text-ink-muted">
          The quotation keeps the details it was sent with. This only records who
          they are now.
        </p>
      </form>
    </Modal>
  )
}

/**
 * @param {object} props
 * @param {object} props.quotation
 * @param {boolean} props.canEdit Whether the user may write a customer record.
 * @param {(quotation: object) => void} props.onLinked
 */
export function QuotationProspectBanner({ quotation, canEdit, onLinked }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!quotation.isProspect) return null

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-info-soft px-4 py-3">
        <p className="min-w-0 text-sm text-info-strong">
          <span className="font-medium">
            {quotation.customer.name} is not in your customer list.
          </span>{' '}
          The quotation carries their details on its own. Add them to raise an
          agreement or invoice from this.
        </p>

        {canEdit && (
          <Button size="sm" onClick={() => setIsOpen(true)}>
            <UserPlus className="size-4" aria-hidden="true" />
            Add as customer
          </Button>
        )}
      </div>

      {isOpen && (
        <AddCustomerModal
          quotation={quotation}
          onClose={() => setIsOpen(false)}
          onLinked={(updated) => {
            setIsOpen(false)
            onLinked(updated)
          }}
        />
      )}
    </>
  )
}
