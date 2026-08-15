import { useId, useState } from 'react'
import { ApiErrorAlert } from '@/components/common'
import { Button, Checkbox, Modal } from '@/components/ui'
import { resetUserPassword } from '../api'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../constants'
import { PasswordField } from './PasswordField'

/**
 * Admin password reset.
 *
 * Deliberately does not ask for the current password — an admin resetting
 * someone else's account does not have it, and pretending otherwise would make
 * the form unusable for its only purpose.
 *
 * It is a separate modal from the profile form for the same reason the API
 * keeps it a separate endpoint: a credential change should be a deliberate
 * act, not something that can ride along with a rename.
 */

function validate(values) {
  const errors = {}

  if (!values.password) {
    errors.password = 'Enter a new password.'
  } else if (values.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  } else if (values.password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `Keep it under ${PASSWORD_MAX_LENGTH} characters.`
  }

  if (values.password && values.confirm !== values.password) {
    // Worth checking here even though the API never sees it: an admin who
    // mistypes a password they are about to read out loud has no way to
    // discover the mistake except by the user failing to sign in.
    errors.confirm = 'The two passwords do not match.'
  }

  return errors
}

/**
 * @param {object} props
 * @param {object} props.user
 * @param {() => void} props.onClose
 * @param {(user: object) => void} props.onSaved
 */
export function ResetPasswordModal({ user, onClose, onSaved }) {
  const formId = useId()

  const [values, setValues] = useState({
    password: '',
    confirm: '',
    mustChangePassword: true,
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const setValue = (key) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value

    setValues((current) => ({ ...current, [key]: value }))
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
      await resetUserPassword(user.id, values)
      onSaved(user)
    } catch (error) {
      setSubmitError(error)
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Reset password"
      description={`Set a new password for ${user.name}.`}
      closeOnBackdropClick={false}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="sm" type="submit" form={formId} isLoading={isSubmitting}>
            Reset password
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="grid gap-4">
        <ApiErrorAlert error={submitError} fallback="Could not reset the password." />

        <p className="text-sm text-ink-muted">
          {user.name} will be signed out of nothing automatically — their current
          session keeps working until it expires. Share the new password securely;
          it is not emailed.
        </p>

        <PasswordField
          value={values.password}
          onChange={setValue('password')}
          error={errors.password}
          label="New password"
          hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        />

        <PasswordField
          value={values.confirm}
          onChange={setValue('confirm')}
          error={errors.confirm}
          label="Confirm password"
          showStrength={false}
        />

        <Checkbox
          label="Require a password change at next sign-in"
          description="Recommended, since you chose this password rather than they did."
          checked={values.mustChangePassword}
          onChange={setValue('mustChangePassword')}
        />
      </form>
    </Modal>
  )
}
