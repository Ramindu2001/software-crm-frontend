import { useId, useState } from 'react'
import { Button, Input, Modal, Select, Textarea } from '@/components/ui'
import { createCustomer } from '../api'

const INITIAL_VALUES = {
  name: '',
  email: '',
  phone: '',
  company: '',
  industry: '',
  contactName: '',
  notes: '',
}

const INDUSTRY_OPTIONS = [
  { value: 'Technology', label: 'Technology' },
  { value: 'Software', label: 'Software' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Logistics', label: 'Logistics' },
  { value: 'Education', label: 'Education' },
  { value: 'Media', label: 'Media' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Agriculture', label: 'Agriculture' },
  { value: 'Aviation', label: 'Aviation' },
  { value: 'Gaming', label: 'Gaming' },
  { value: 'Mining', label: 'Mining' },
  { value: 'Other', label: 'Other' },
]

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(values) {
  const errors = {}

  if (!values.name.trim()) {
    errors.name = 'Customer name is required.'
  } else if (values.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.'
  }

  if (values.email && !EMAIL_PATTERN.test(values.email)) {
    errors.email = 'Enter a valid email address.'
  }

  return errors
}

/**
 * Create-customer form.
 *
 * Mounted only while open — every open starts from a clean form.
 *
 * @param {object} props
 * @param {() => void} props.onClose
 * @param {(customer: object) => void} props.onCreated
 */
export function CreateCustomerModal({ onClose, onCreated }) {
  const formId = useId()
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const setValue = (key) => (event) => {
    const { value } = event.target
    setValues((current) => ({ ...current, [key]: value }))
    // Clear a field's error as soon as the user edits it.
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current,
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const customer = await createCustomer(values)
      onCreated(customer)
    } catch (error) {
      setSubmitError(error.message ?? 'Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Add customer"
      description="Create a new customer record for your team."
      size="lg"
      closeOnBackdropClick={false}
      footer={
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button size="sm" type="submit" form={formId} isLoading={isSubmitting}>
            Add customer
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="grid gap-4">
        {submitError && (
          <p
            role="alert"
            className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-strong"
          >
            {submitError}
          </p>
        )}

        <Input
          label="Customer name"
          value={values.name}
          onChange={setValue('name')}
          error={errors.name}
          placeholder="e.g. Acme Corp"
          required
          autoFocus
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Email"
            type="email"
            value={values.email}
            onChange={setValue('email')}
            error={errors.email}
            placeholder="support@customer.com"
          />

          <Input
            label="Phone"
            type="tel"
            value={values.phone}
            onChange={setValue('phone')}
            placeholder="+1 (555) 123-4567"
          />

          <Input
            label="Company"
            value={values.company}
            onChange={setValue('company')}
            placeholder="Legal entity name"
            hint="Defaults to customer name if blank."
          />

          <Select
            label="Industry"
            value={values.industry}
            onChange={setValue('industry')}
            options={INDUSTRY_OPTIONS}
            placeholder="Select an industry"
          />

          <Input
            label="Primary contact"
            value={values.contactName}
            onChange={setValue('contactName')}
            placeholder="Contact person's name"
          />
        </div>

        <Textarea
          label="Notes"
          value={values.notes}
          onChange={setValue('notes')}
          placeholder="Internal notes about this customer…"
          rows={3}
        />
      </form>
    </Modal>
  )
}
