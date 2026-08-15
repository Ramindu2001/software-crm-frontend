import { useId, useState } from 'react'
import { ApiErrorAlert } from '@/components/common'
import { Button, Checkbox, Input, Modal, Select } from '@/components/ui'
import { createUser, updateUser } from '../api'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USER_ROLE,
  USER_ROLE_OPTIONS,
} from '../constants'
import { PasswordField } from './PasswordField'

/**
 * Create / edit team member.
 *
 * One component for both, because POST and PUT take the same profile fields.
 * The one difference is the password, which appears only on create:
 *
 *   - on create it is required, because an account needs credentials
 *   - on edit it is absent, because changing a password is its own endpoint.
 *     Folding it into the profile form would mean a rename could reset
 *     someone's credentials by leaving a field blank.
 *
 * Takes no `isOpen` prop by design: the parent mounts it only while open, so
 * every open starts from the record as it currently stands.
 */

const EMPTY = {
  name: '',
  email: '',
  role: 'Developer',
  password: '',
  mustChangePassword: true,
}

// Mirrors the server's EMAIL_RE closely enough to catch typos before a round
// trip. The server remains the authority.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(values, { isEdit }) {
  const errors = {}

  if (!values.name.trim()) {
    errors.name = 'Full name is required.'
  } else if (values.name.trim().length < 2) {
    errors.name = 'Enter at least 2 characters.'
  } else if (values.name.trim().length > 255) {
    errors.name = 'Keep the name under 255 characters.'
  }

  const email = values.email.trim()
  if (!email) {
    errors.email = 'Email is required.'
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!values.role) errors.role = 'Choose a role.'

  if (!isEdit) {
    if (!values.password) {
      errors.password = 'Set an initial password.'
    } else if (values.password.length < PASSWORD_MIN_LENGTH) {
      errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`
    } else if (values.password.length > PASSWORD_MAX_LENGTH) {
      errors.password = `Keep it under ${PASSWORD_MAX_LENGTH} characters.`
    }
  }

  return errors
}

/**
 * @param {object} props
 * @param {object} [props.user] Omit to create; pass a record to edit.
 * @param {() => void} props.onClose
 * @param {(user: object, mode: 'create'|'edit') => void} props.onSaved
 */
export function UserFormModal({ user, onClose, onSaved }) {
  const formId = useId()
  const isEdit = Boolean(user)

  const [values, setValues] = useState(() =>
    user ? { ...EMPTY, name: user.name, email: user.email, role: user.role } : EMPTY,
  )
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const setValue = (key) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value

    setValues((current) => ({ ...current, [key]: value }))
    // Clear a field's error as soon as the user edits it.
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current,
    )
    // A duplicate-email banner is stale the moment the email changes.
    if (key === 'email') setSubmitError(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validate(values, { isEdit })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const saved = isEdit
        ? await updateUser(user.id, values)
        : await createUser(values)
      onSaved(saved, isEdit ? 'edit' : 'create')
    } catch (error) {
      // A 409 on the email is a field-level problem, so it binds to the input
      // rather than only appearing as a banner the user has to connect back to
      // a field themselves.
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

  const roleBlurb = USER_ROLE[values.role]?.blurb

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Edit team member' : 'Create user'}
      description={
        isEdit
          ? 'Update this person’s details and role.'
          : 'Add someone to the workspace and choose what kind of access they get.'
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
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="grid gap-4">
        <ApiErrorAlert
          error={submitError}
          fallback={isEdit ? 'Could not save the changes.' : 'Could not create the user.'}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full name"
            value={values.name}
            onChange={setValue('name')}
            error={errors.name}
            placeholder="e.g. Nadia Perera"
            required
            autoFocus
          />

          <Input
            label="Email"
            type="email"
            value={values.email}
            onChange={setValue('email')}
            error={errors.email}
            placeholder="nadia@synnexit.com"
            hint="Used to sign in. Must be unique."
            required
          />
        </div>

        <div>
          <Select
            label="Role"
            value={values.role}
            onChange={setValue('role')}
            options={USER_ROLE_OPTIONS}
            error={errors.role}
            required
          />
          {/* What the role is for. What it can actually do lives in the
              permission matrix and changes at runtime, so it is linked to
              rather than restated here. */}
          {roleBlurb && (
            <p className="mt-1.5 text-xs text-ink-muted">{roleBlurb}</p>
          )}
        </div>

        {!isEdit && (
          <div className="grid gap-3 rounded-lg border border-line bg-sunken p-3">
            <PasswordField
              value={values.password}
              onChange={setValue('password')}
              error={errors.password}
              label="Initial password"
              hint={`At least ${PASSWORD_MIN_LENGTH} characters. Share it with them securely — it is not emailed.`}
            />

            <Checkbox
              label="Require a password change at first sign-in"
              description="Recommended, since you chose this password rather than they did."
              checked={values.mustChangePassword}
              onChange={setValue('mustChangePassword')}
            />
          </div>
        )}
      </form>
    </Modal>
  )
}
