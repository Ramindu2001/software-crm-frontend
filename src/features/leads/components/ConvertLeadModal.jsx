import { useState } from 'react'
import { ApiErrorAlert } from '@/components/common'
import { Button, Input, Modal, Select, Textarea } from '@/components/ui'
import { convertLead } from '../api'
import { useLookups } from '../hooks'

/**
 * Win the deal, and promote the lead into a customer.
 *
 * This is the only route to "Won", because winning means there is now somebody
 * to invoice — and the rest of the system (quotations, agreements, tickets) is
 * built on `customer_id`. The API writes the customer and closes the lead in
 * one transaction, so the two can never disagree.
 *
 * Two modes, because both happen in practice:
 *   new       a first-time customer, seeded from what the lead already knows
 *   existing  an established customer buying a second product
 *
 * The customers table is NOT NULL on company, contact and email. That is the
 * promotion a lead earns by being won: it finally has enough detail to be
 * billed. Where the lead already has a value it is prefilled, so in the common
 * case this dialog is a confirmation rather than a retyping exercise.
 *
 * @param {object} props
 * @param {object} props.lead
 * @param {() => void} props.onClose
 * @param {(lead: object) => void} props.onConverted
 */
export function ConvertLeadModal({ lead, onClose, onConverted }) {
  const [mode, setMode] = useState('new')
  const [customerId, setCustomerId] = useState('')
  const [values, setValues] = useState({
    // The lead's company is the obvious candidate; when it was never captured
    // the contact's own name is a better placeholder than an empty box.
    companyName: lead.companyName || lead.contactName,
    contactPerson: lead.contactName,
    email: lead.email,
    phone: lead.phone,
    address: '',
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const { customers, isLoading: isLoadingCustomers } = useLookups({ customers: true })

  const setValue = (key) => (event) => {
    const { value } = event.target
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
  }

  const validate = () => {
    if (mode === 'existing') {
      return customerId ? {} : { customerId: 'Pick the customer to link this lead to.' }
    }

    const found = {}
    if (!values.companyName.trim()) found.companyName = 'A company name is required.'
    if (!values.contactPerson.trim()) found.contactPerson = 'A contact person is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) {
      // Required here even though it is optional on a lead: invoices and
      // quotations are emailed, so a customer without one cannot be served.
      found.email = 'A valid email is required to raise quotations and invoices.'
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
      onConverted(
        await convertLead(
          lead.id,
          mode === 'existing' ? { customerId } : values,
        ),
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
      title="Mark as won"
      description={`${lead.id} · ${lead.contactName}. Winning creates the customer record this lead can then be quoted against.`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form="convert-lead-form" disabled={isSaving}>
            {isSaving ? 'Converting…' : 'Mark won & create customer'}
          </Button>
        </>
      }
    >
      <form id="convert-lead-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <ApiErrorAlert error={error} />}

        <Select
          label="Customer record"
          value={mode}
          onChange={(event) => setMode(event.target.value)}
          options={[
            { value: 'new', label: 'Create a new customer' },
            { value: 'existing', label: 'Link to an existing customer' },
          ]}
          hint="Link an existing one if they already buy from us."
        />

        {mode === 'existing' ? (
          <Select
            label="Which customer?"
            value={customerId}
            onChange={(event) => {
              setCustomerId(event.target.value)
              setErrors({})
            }}
            options={customers}
            placeholder={isLoadingCustomers ? 'Loading…' : 'Pick a customer'}
            error={errors.customerId}
            disabled={isLoadingCustomers}
            required
          />
        ) : (
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
              placeholder="accounts@example.lk"
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
              placeholder="Optional. Appears on quotations and agreements."
              rows={2}
              wrapperClassName="sm:col-span-2"
            />
          </div>
        )}
      </form>
    </Modal>
  )
}
