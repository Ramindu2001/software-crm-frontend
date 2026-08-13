import { useId, useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input, Modal, Select } from '@/components/ui'
import { createQuotation } from '../api'
import { listCustomers } from '@/features/customers/api'

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const INITIAL_ITEM = { id: 'new-1', productName: '', quantity: 1, unitPrice: 0 }

function validate(values, items) {
  const errors = {}
  
  if (!values.customerId) {
    errors.customerId = 'Customer is required.'
  }

  const itemErrors = items.map(item => {
    const err = {}
    if (!item.productName.trim()) err.productName = 'Product name required'
    if (item.quantity <= 0) err.quantity = 'Must be > 0'
    if (item.unitPrice < 0) err.unitPrice = 'Must be >= 0'
    return err
  })

  const hasItemErrors = itemErrors.some(err => Object.keys(err).length > 0)

  return { errors, itemErrors, hasItemErrors }
}

export function CreateQuotationModal({ onClose, onCreated }) {
  const formId = useId()
  const [customers, setCustomers] = useState([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)

  const [values, setValues] = useState({ customerId: '', date: new Date().toISOString().split('T')[0] })
  const [items, setItems] = useState([INITIAL_ITEM])
  const [nextItemId, setNextItemId] = useState(2)
  
  const [errors, setErrors] = useState({})
  const [itemErrors, setItemErrors] = useState([])
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    let ignore = false
    listCustomers({ perPage: 100 })
      .then((res) => {
        if (!ignore) {
          setCustomers(res.data.map(c => ({ value: String(c.id), label: c.name })))
          setIsLoadingCustomers(false)
        }
      })
      .catch(() => {
        if (!ignore) setIsLoadingCustomers(false)
      })
    return () => { ignore = true }
  }, [])

  const setValue = (key) => (event) => {
    const { value } = event.target
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
  }

  const handleAddItem = () => {
    setItems((current) => [
      ...current,
      { id: `new-${nextItemId}`, productName: '', quantity: 1, unitPrice: 0 }
    ])
    setNextItemId((id) => id + 1)
  }

  const handleRemoveItem = (id) => {
    if (items.length === 1) return // Keep at least one item
    setItems((current) => current.filter((item) => item.id !== id))
  }

  const updateItem = (id, field, value) => {
    setItems((current) => 
      current.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value }
        }
        return item
      })
    )
    // Clear item error if editing
    setItemErrors([])
  }

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const { errors: newErrors, itemErrors: newItemErrors, hasItemErrors } = validate(values, items)
    setErrors(newErrors)
    setItemErrors(newItemErrors)
    
    if (Object.keys(newErrors).length > 0 || hasItemErrors) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const quotation = await createQuotation({ ...values, items })
      onCreated(quotation)
    } catch (error) {
      setSubmitError(error.message ?? 'Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Create Quotation"
      description="Draft a new quotation with line items."
      size="lg"
      closeOnBackdropClick={false}
      footer={
        <>
          <div className="mr-auto font-semibold text-ink">
            Total: {CURRENCY_FORMATTER.format(totalAmount)}
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="sm" type="submit" form={formId} isLoading={isSubmitting}>
            Create
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="grid gap-6">
        {submitError && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-strong">
            {submitError}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Customer"
            value={values.customerId}
            onChange={setValue('customerId')}
            options={customers}
            error={errors.customerId}
            disabled={isLoadingCustomers}
            placeholder={isLoadingCustomers ? 'Loading...' : 'Select a customer'}
            required
          />

          <Input
            label="Date"
            type="date"
            value={values.date}
            onChange={setValue('date')}
            error={errors.date}
            required
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Line Items</h3>
            <Button type="button" size="sm" variant="secondary" onClick={handleAddItem}>
              <Plus className="mr-1.5 size-4" />
              Add Item
            </Button>
          </div>
          
          <div className="space-y-3">
            {items.map((item, index) => {
              const errs = itemErrors[index] || {}
              return (
                <div key={item.id} className="relative grid gap-3 rounded-lg border border-line bg-surface p-3 pr-10 sm:grid-cols-12 sm:pr-12">
                  <div className="sm:col-span-5">
                    <Input
                      aria-label="Product name"
                      placeholder="Product name"
                      value={item.productName}
                      onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                      error={errs.productName}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Input
                      type="number"
                      aria-label="Quantity"
                      placeholder="Qty"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                      error={errs.quantity}
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <Input
                      type="number"
                      aria-label="Unit price"
                      placeholder="Price"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                      error={errs.unitPrice}
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={items.length === 1}
                    className="absolute right-2 top-3 rounded p-1.5 text-ink-subtle hover:bg-danger-soft hover:text-danger-strong disabled:opacity-50 sm:top-auto sm:self-center"
                    aria-label="Remove item"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </form>
    </Modal>
  )
}
