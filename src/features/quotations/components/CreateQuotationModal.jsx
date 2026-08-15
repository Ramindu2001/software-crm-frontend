import { useEffect, useId, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ApiErrorAlert } from '@/components/common'
import { Button, Input, Modal, Select } from '@/components/ui'
import { listCustomerOptions } from '@/features/customers/api'
import { listProductOptions } from '@/features/products/api'
import { createQuotation } from '../api'

/**
 * Create-quotation form.
 *
 * Amounts shown here are a local preview only. The server recomputes every
 * total in integer cents and ignores anything we might send — a client that
 * could post its own total could quote itself any price — so what this form
 * submits is quantity, unit price and an optional discount, nothing more.
 *
 * There is no date field: the schema has no quotation date, and `created_at`
 * is stamped when the row is written.
 *
 * Takes no `isOpen` prop by design: the parent mounts it only while open, so
 * every open starts from a clean form.
 */

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  maximumFractionDigits: 2,
})

/** DECIMAL(10,2) tops out here, and the API rejects anything larger. */
const DECIMAL_MAX = 99999999.99

const newItem = (key) => ({ key, productId: '', quantity: 1, unitPrice: '' })

function validate(values, items, totalAmount) {
  const errors = {}

  if (!values.customerId) errors.customerId = 'Select a customer.'

  const discount = Number(values.discount) || 0
  if (discount < 0) {
    errors.discount = 'Discount cannot be negative.'
  } else if (discount > totalAmount) {
    // The API rejects this outright rather than storing a negative total.
    errors.discount = 'Discount cannot exceed the total.'
  }

  const itemErrors = items.map((item) => {
    const itemError = {}
    if (!item.productId) itemError.productId = 'Required'

    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity < 1) {
      itemError.quantity = 'Whole number, 1 or more'
    }

    const unitPrice = Number(item.unitPrice)
    if (item.unitPrice === '' || Number.isNaN(unitPrice) || unitPrice < 0) {
      itemError.unitPrice = 'Enter a price'
    } else if (quantity * unitPrice > DECIMAL_MAX) {
      itemError.unitPrice = 'Line total is too large'
    }

    return itemError
  })

  const hasItemErrors = itemErrors.some(
    (itemError) => Object.keys(itemError).length > 0,
  )

  return { errors, itemErrors, hasItemErrors }
}

/**
 * @param {object} props
 * @param {() => void} props.onClose
 * @param {(created: {id: string, totalAmount: number, finalAmount: number}) => void} props.onCreated
 */
export function CreateQuotationModal({ onClose, onCreated }) {
  const formId = useId()

  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)

  const [values, setValues] = useState({ customerId: '', discount: '' })
  const [items, setItems] = useState([newItem(1)])
  const [nextKey, setNextKey] = useState(2)

  const [errors, setErrors] = useState({})
  const [itemErrors, setItemErrors] = useState([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    let ignore = false

    // Both endpoints are unpaginated master data, so one call each is the
    // whole picker.
    Promise.all([listCustomerOptions(), listProductOptions()])
      .then(([customerOptions, productOptions]) => {
        if (ignore) return
        setCustomers(customerOptions)
        setProducts(productOptions)
        setIsLoadingOptions(false)
      })
      .catch(() => {
        // A failed lookup leaves the selects empty rather than blocking the
        // form; the submit will surface the real problem.
        if (!ignore) setIsLoadingOptions(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  const setValue = (key) => (event) => {
    const { value } = event.target
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
  }

  const handleAddItem = () => {
    setItems((current) => [...current, newItem(nextKey)])
    setNextKey((key) => key + 1)
  }

  const handleRemoveItem = (key) => {
    // The API requires at least one line item.
    if (items.length === 1) return
    setItems((current) => current.filter((item) => item.key !== key))
    setItemErrors([])
  }

  const updateItem = (key, field, value) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    )
    setItemErrors([])
  }

  // Preview of what the server will compute: sum of quantity x unit price,
  // less the discount.
  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  )
  const discount = Number(values.discount) || 0
  const finalAmount = Math.max(0, totalAmount - discount)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const {
      errors: nextErrors,
      itemErrors: nextItemErrors,
      hasItemErrors,
    } = validate(values, items, totalAmount)

    setErrors(nextErrors)
    setItemErrors(nextItemErrors)
    if (Object.keys(nextErrors).length > 0 || hasItemErrors) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const created = await createQuotation({ ...values, items })
      onCreated(created)
    } catch (error) {
      // A 422 reports every bad line at once, indexed:
      // "items[1]: quantity must be at least 1".
      setSubmitError(error)
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Create quotation"
      description="Price line items from the catalogue for a customer."
      size="lg"
      closeOnBackdropClick={false}
      footer={
        <>
          <div className="mr-auto text-sm">
            <span className="text-ink-muted">Total </span>
            <span className="font-semibold text-ink tabular-nums">
              {CURRENCY_FORMATTER.format(finalAmount)}
            </span>
            {discount > 0 && (
              <span className="ml-1.5 text-xs text-ink-subtle">
                after {CURRENCY_FORMATTER.format(discount)} off
              </span>
            )}
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
        <ApiErrorAlert error={submitError} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Customer"
            value={values.customerId}
            onChange={setValue('customerId')}
            options={customers}
            error={errors.customerId}
            disabled={isLoadingOptions}
            placeholder={isLoadingOptions ? 'Loading…' : 'Select a customer'}
            required
          />

          <Input
            label="Discount"
            type="number"
            min="0"
            step="0.01"
            value={values.discount}
            onChange={setValue('discount')}
            error={errors.discount}
            placeholder="0.00"
            hint="Applied to the order total."
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Line items</h3>
            <Button type="button" size="sm" variant="secondary" onClick={handleAddItem}>
              <Plus className="mr-1.5 size-4" aria-hidden="true" />
              Add item
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => {
              const itemError = itemErrors[index] ?? {}
              const lineTotal =
                (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)

              return (
                <div
                  key={item.key}
                  className="relative grid gap-3 rounded-lg border border-line bg-surface p-3 pr-10 sm:grid-cols-12 sm:pr-12"
                >
                  <div className="sm:col-span-5">
                    <Select
                      aria-label={`Product for line ${index + 1}`}
                      value={item.productId}
                      onChange={(event) =>
                        updateItem(item.key, 'productId', event.target.value)
                      }
                      options={products}
                      disabled={isLoadingOptions}
                      error={itemError.productId}
                      placeholder="Select a product"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Input
                      type="number"
                      aria-label={`Quantity for line ${index + 1}`}
                      placeholder="Qty"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(item.key, 'quantity', event.target.value)
                      }
                      error={itemError.quantity}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Input
                      type="number"
                      aria-label={`Unit price for line ${index + 1}`}
                      placeholder="Unit price"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) =>
                        updateItem(item.key, 'unitPrice', event.target.value)
                      }
                      error={itemError.unitPrice}
                    />
                  </div>

                  <div className="flex items-center justify-end sm:col-span-2">
                    <span className="text-sm tabular-nums text-ink-muted">
                      {CURRENCY_FORMATTER.format(lineTotal)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.key)}
                    disabled={items.length === 1}
                    className="absolute top-3 right-2 rounded p-1.5 text-ink-subtle hover:bg-danger-soft hover:text-danger-strong disabled:opacity-50 sm:top-auto sm:self-center"
                    aria-label={`Remove line ${index + 1}`}
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
