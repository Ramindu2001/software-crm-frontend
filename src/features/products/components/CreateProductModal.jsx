import { useId, useState } from 'react'
import { Button, Input, Modal, Select, Textarea } from '@/components/ui'
import { createProduct } from '../api'

const INITIAL_VALUES = {
  name: '',
  type: 'Software',
  description: '',
  annual_fee_1st_year: '',
  annual_fee_2nd_year: '',
  monthly_price: '',
}

const TYPE_OPTIONS = [
  { value: 'Software', label: 'Software' },
  { value: 'Service', label: 'Service' },
]

function validate(values) {
  const errors = {}

  if (!values.name.trim()) {
    errors.name = 'Name is required.'
  }

  if (values.annual_fee_1st_year === '' || Number(values.annual_fee_1st_year) < 0) {
    errors.annual_fee_1st_year = 'Must be >= 0'
  }
  
  if (values.annual_fee_2nd_year === '' || Number(values.annual_fee_2nd_year) < 0) {
    errors.annual_fee_2nd_year = 'Must be >= 0'
  }
  
  if (values.monthly_price === '' || Number(values.monthly_price) < 0) {
    errors.monthly_price = 'Must be >= 0'
  }

  return errors
}

export function CreateProductModal({ onClose, onCreated }) {
  const formId = useId()
  const [values, setValues] = useState(INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const setValue = (key) => (event) => {
    const { value } = event.target
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const product = await createProduct(values)
      onCreated(product)
    } catch (error) {
      setSubmitError(error.message ?? 'Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="New product"
      description="Add a new product or service to the catalog."
      size="lg"
      closeOnBackdropClick={false}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="sm" type="submit" form={formId} isLoading={isSubmitting}>
            Create product
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="grid gap-4">
        {submitError && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-strong">
            {submitError}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={values.name}
            onChange={setValue('name')}
            error={errors.name}
            placeholder="e.g. Analytics Pro"
            required
            autoFocus
          />

          <Select
            label="Type"
            value={values.type}
            onChange={setValue('type')}
            options={TYPE_OPTIONS}
          />
        </div>

        <Textarea
          label="Description"
          value={values.description}
          onChange={setValue('description')}
          placeholder="What does this product do?"
          rows={3}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            type="number"
            min="0"
            step="0.01"
            label="1st Year Annual Fee"
            value={values.annual_fee_1st_year}
            onChange={setValue('annual_fee_1st_year')}
            error={errors.annual_fee_1st_year}
            placeholder="0.00"
          />

          <Input
            type="number"
            min="0"
            step="0.01"
            label="2nd Year Annual Fee"
            value={values.annual_fee_2nd_year}
            onChange={setValue('annual_fee_2nd_year')}
            error={errors.annual_fee_2nd_year}
            placeholder="0.00"
          />

          <Input
            type="number"
            min="0"
            step="0.01"
            label="Monthly Price"
            value={values.monthly_price}
            onChange={setValue('monthly_price')}
            error={errors.monthly_price}
            placeholder="0.00"
          />
        </div>
      </form>
    </Modal>
  )
}
