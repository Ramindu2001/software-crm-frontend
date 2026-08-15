import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/components/ui'
import { PASSWORD_MIN_LENGTH } from '../constants'

/**
 * Password input with a reveal toggle and a live strength meter.
 *
 * The reveal exists because an admin is typing a password they must then
 * communicate to someone else — they need to be able to check it. Hidden by
 * default so it is a deliberate act, not the resting state.
 *
 * The meter is guidance, not a gate: the only rule the API enforces is a
 * minimum length, and inventing extra client-side rules would mean rejecting
 * passwords the server would happily accept.
 */

/**
 * Four cheap signals — length, mixed case, digits, symbols — scored 0-4.
 * Deliberately not a real entropy estimate: this is a nudge toward a better
 * password, and a precise-looking score would imply a guarantee it cannot make.
 */
function scorePassword(password) {
  if (!password) return 0

  let score = 0
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password) && /[^\w\s]/.test(password)) score += 1

  return Math.min(score, 4)
}

const STRENGTH = [
  { label: '', tone: '' },
  { label: 'Weak', tone: 'bg-danger-solid' },
  { label: 'Fair', tone: 'bg-warning-solid' },
  { label: 'Good', tone: 'bg-info-solid' },
  { label: 'Strong', tone: 'bg-success-solid' },
]

/**
 * @param {object} props
 * @param {string} props.value
 * @param {(event: object) => void} props.onChange
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {string} [props.hint]
 * @param {boolean} [props.showStrength] Hide on a login-style field, where a
 *   meter would rate a password the user cannot change here.
 */
export function PasswordField({
  value,
  onChange,
  label = 'Password',
  error,
  hint,
  showStrength = true,
  ...props
}) {
  const [isVisible, setIsVisible] = useState(false)
  const meterId = useId()

  const score = showStrength ? scorePassword(value) : 0
  const strength = STRENGTH[score]

  return (
    <div>
      <Input
        label={label}
        type={isVisible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        error={error}
        hint={hint}
        autoComplete="new-password"
        aria-describedby={showStrength && value ? meterId : undefined}
        trailing={
          <button
            type="button"
            onClick={() => setIsVisible((current) => !current)}
            className="rounded p-1 text-ink-subtle transition-colors hover:text-ink"
            // The control is the toggle, so the label states the action rather
            // than the current state.
            aria-label={isVisible ? 'Hide password' : 'Show password'}
          >
            {isVisible ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        }
        {...props}
      />

      {showStrength && value && (
        <div id={meterId} className="mt-2 flex items-center gap-2">
          <div
            className="flex h-1 flex-1 gap-1"
            role="img"
            aria-label={`Password strength: ${strength.label}`}
          >
            {[1, 2, 3, 4].map((step) => (
              <span
                key={step}
                className={`flex-1 rounded-full transition-colors ${
                  step <= score ? strength.tone : 'bg-line'
                }`}
              />
            ))}
          </div>
          <span className="w-12 text-right text-xs text-ink-muted">
            {strength.label}
          </span>
        </div>
      )}
    </div>
  )
}
