import { useId, useState } from 'react'
import { ApiErrorAlert } from '@/components/common'
import { Button, Input, Modal, Textarea } from '@/components/ui'
import { createCustomer, updateCustomer } from '../api'

/**
 * Create / edit customer form.
 *
 * One component for both, because POST and PUT take the same body. The only
 * differences are the endpoint and the starting values.
 *
 * PUT is a **full replacement**: a field left out of the payload is set to
 * NULL rather than keeping its stored value. That is the behaviour an edit
 * form wants — clearing the address box should actually clear the address —
 * but it means the form must start from the complete record and always submit
 * every field. It does, because the list row already carries all six columns,
 * so editing needs no extra fetch.
 *
 * Takes no `isOpen` prop by design: the parent mounts it only while open, so
 * every open starts from the record as it currently stands.
 */

const EMPTY = { name: '', contactPerson: '', email: '', phone: '', address: '' }

// Mirrors the server's EMAIL_RE closely enough to catch typos before a round
// trip. The server remains the authority.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
// Digits plus the separators people actually type, with an optional +country.
const PHONE_PATTERN = /^\+?[\d\s().-]+$/

/**
 * Client-side mirror of the backend validator, so the common mistakes are
 * caught without a round trip. Anything that slips through still comes back
 * as a 422 listing every problem at once.
 */
function validate(values) {
  const errors = {}

  if (!values.name.trim()) {
    errors.name = 'Company name is required.'
  } else if (values.name.trim().length > 255) {
    errors.name = 'Keep the company name under 255 characters.'
  }

  if (!values.contactPerson.trim()) {
    errors.contactPerson = 'Contact person is required.'
  } else if (values.contactPerson.trim().length > 255) {
    errors.contactPerson = 'Keep the contact name under 255 characters.'
  }

  const email = values.email.trim()
  if (!email) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.'
  } else if (email.length > 255) {
    errors.email = 'Keep the email under 255 characters.'
  }

  // Optional, but has to look like a number if given — the server requires
  // 7 to 15 digits, which is what keeps "n/a" out of the column.
  const phone = values.phone.trim()
  if (phone) {
    const digits = phone.replace(/\D/g, '')
    if (!PHONE_PATTERN.test(phone) || digits.length < 7 || digits.length > 15) {
      errors.phone = 'Enter a valid phone number, or leave it blank.'
    } else if (phone.length > 50) {
      errors.phone = 'Keep the phone number under 50 characters.'
    }
  }

  return errors
}

/**
 * @param {object} props
 * @param {object} [props.customer] Omit to create; pass a record to edit.
 * @param {() => void} props.onClose
 * @param {(customer: object, mode: 'create'|'edit') => void} props.onSaved
 */
export function CustomerFormModal({ customer, onClose, onSaved }) {
  const formId = useId()
  const isEdit = Boolean(customer)

  const [values, setValues] = useState(() =>
    customer ? { ...EMPTY, ...customer } : EMPTY,
  )
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const setValue = (key) => (event) => {
    const { value } = event.target
    setValues((current) => ({ ...current, [key]: value }))
    // Clear a field's error as soon as the user edits it — re-validating on
    // every keystroke would nag while they are still typing.
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current,
    )
    // A duplicate-email banner is stale the moment the email changes.
    if (key === 'email') setSubmitError(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const saved = isEdit
        ? await updateCustomer(customer.id, values)
        : await createCustomer(values)
      onSaved(saved, isEdit ? 'edit' : 'create')
    } catch (error) {
      // A 409 is a field-level problem, so it is bound to the email input
      // rather than shown only as a banner the user has to connect back to a
      // field themselves. The server's message names the clashing customer,
      // so it goes above the form too.
      if (error.field) {
        setErrors((current) => ({
          ...current,
          [error.field]: 'That email is already taken.',
        }))
      }
      setSubmitError(error)
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Edit customer' : 'Add customer'}
      description={
        isEdit
          ? 'Update this customer record. Clearing a field removes it.'
          : 'Create a customer record your team can raise issues and quotations against.'
      }
      size="lg"
      // Avoid discarding a half-written form on a stray backdrop click.
      closeOnBackdropClick={false}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {/* Lives outside the <form>, so it associates by id. */}
          <Button size="sm" type="submit" form={formId} isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Add customer'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="grid gap-4">
        <ApiErrorAlert
          error={submitError}
          fallback={
            isEdit ? 'Could not save the changes.' : 'Could not add the customer.'
          }
        />

        <Input
          label="Company name"
          value={values.name}
          onChange={setValue('name')}
          error={errors.name}
          placeholder="e.g. Acme Corp"
          required
          autoFocus
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Contact person"
            value={values.contactPerson}
            onChange={setValue('contactPerson')}
            error={errors.contactPerson}
            placeholder="Who your team speaks to"
            required
          />

          <Input
            label="Email"
            type="email"
            value={values.email}
            onChange={setValue('email')}
            error={errors.email}
            placeholder="jane@acme.com"
            hint="Must be unique across customers."
            required
          />
        </div>

        <Input
          label="Phone"
          type="tel"
          value={values.phone}
          onChange={setValue('phone')}
          error={errors.phone}
          placeholder="+94 77 123 4567"
          hint="Optional. Any format, as long as it carries 7–15 digits."
        />

        <Textarea
          label="Address"
          value={values.address}
          onChange={setValue('address')}
          placeholder="Street, city, postal code…"
          rows={3}
          hint="Optional."
        />
      </form>
    </Modal>
  )
}
