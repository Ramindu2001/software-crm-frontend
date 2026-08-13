import { useId, useState } from 'react'
import { Button, Input, Modal, Select, Textarea } from '@/components/ui'
import { createIssue } from '../api'
import { useIssueFormOptions } from '../hooks/useIssueFormOptions'
import { PRIORITY_OPTIONS } from '../constants'

const INITIAL_VALUES = {
  title: '',
  description: '',
  category: 'Bug',
  priority: 'Medium',
  customerId: '',
  productId: '',
  assigneeId: '',
}

function validate(values) {
  const errors = {}

  if (!values.title.trim()) {
    errors.title = 'Title is required.'
  } else if (values.title.trim().length < 8) {
    errors.title = 'Add a little more detail — at least 8 characters.'
  }

  if (!values.customerId) errors.customerId = 'Select a customer.'
  if (!values.productId) errors.productId = 'Select a product.'

  return errors
}

/**
 * Create-issue form.
 *
 * Takes no `isOpen` prop by design: the parent mounts it only while open, so
 * every open starts from a clean form rather than retaining an abandoned draft.
 *
 * @param {object} props
 * @param {() => void} props.onClose
 * @param {(issue: object) => void} props.onCreated
 */
export function CreateIssueModal({ onClose, onCreated }) {
  const formId = useId()
  const { assignees, customers, products, isLoading: isLoadingOptions } =
    useIssueFormOptions()
  const [values, setValues] = useState(INITIAL_VALUES)
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
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const issue = await createIssue(values)
      onCreated(issue)
    } catch (error) {
      setSubmitError(error.message ?? 'Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="New issue"
      description="Describe the problem so the team can triage it."
      size="lg"
      // Avoid discarding a half-written form on a stray backdrop click.
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
          {/* Lives outside the <form>, so it associates by id. */}
          <Button size="sm" type="submit" form={formId} isLoading={isSubmitting}>
            Create issue
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
          label="Title"
          value={values.title}
          onChange={setValue('title')}
          error={errors.title}
          placeholder="Summarise the problem"
          required
          autoFocus
        />

        <Textarea
          label="Description"
          value={values.description}
          onChange={setValue('description')}
          placeholder="Steps to reproduce, expected vs actual behaviour…"
          rows={4}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Priority"
            value={values.priority}
            onChange={setValue('priority')}
            options={PRIORITY_OPTIONS}
          />

          <Select
            label="Category"
            value={values.category}
            onChange={setValue('category')}
            options={[
              { value: 'Bug', label: 'Bug' },
              { value: 'Feature', label: 'Feature' },
            ]}
          />

          <Select
            label="Customer"
            value={values.customerId}
            onChange={setValue('customerId')}
            options={customers}
            disabled={isLoadingOptions}
            error={errors.customerId}
            placeholder={isLoadingOptions ? 'Loading…' : 'Select a customer'}
          />

          <Select
            label="Product"
            value={values.productId}
            onChange={setValue('productId')}
            options={products}
            disabled={isLoadingOptions}
            error={errors.productId}
            placeholder={isLoadingOptions ? 'Loading…' : 'Select a product'}
          />

          <Select
            label="Assignee"
            value={values.assigneeId}
            onChange={setValue('assigneeId')}
            options={assignees}
            disabled={isLoadingOptions}
            placeholder="Unassigned"
          />
        </div>
      </form>
    </Modal>
  )
}
