import { useState } from 'react'
import { Eye, EyeOff, TriangleAlert } from 'lucide-react'
import { APP_NAME } from '@/config/constants'
import { Button, Checkbox, Input } from '@/components/ui'
import { useAuth } from '../AuthContext'
import { DEMO_CREDENTIALS } from '../api'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate({ email, password }) {
  const errors = {}
  if (!email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_PATTERN.test(email.trim()))
    errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Password is required.'
  return errors
}

export function LoginPage() {
  const { login } = useAuth()

  const [values, setValues] = useState({
    email: '',
    password: '',
    remember: false,
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const setValue = (key) => (event) => {
    const value =
      event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current,
    )
    setFormError(null)
  }

  const fillDemoCredentials = () => {
    setValues((current) => ({ ...current, ...DEMO_CREDENTIALS }))
    setErrors({})
    setFormError(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    setFormError(null)

    try {
      await login(values)
      // No navigate() here: success flips auth status, and RequireGuest sends
      // the user on. Keeping redirects in one place avoids the two layers
      // disagreeing. isSubmitting stays true so the button holds its loading
      // state until this screen unmounts.
    } catch (error) {
      setFormError(error.message ?? 'Could not sign in. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-ink-inverse">
            S
          </div>
          <span className="text-base font-semibold text-ink">{APP_NAME}</span>
        </div>

        <div className="rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
          <h1 className="text-lg font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Enter your credentials to access the workspace.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-4">
            {formError && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-strong"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {formError}
              </p>
            )}

            <Input
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              autoFocus
              value={values.email}
              onChange={setValue('email')}
              error={errors.email}
              placeholder="you@synnex.com"
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              value={values.password}
              onChange={setValue('password')}
              error={errors.password}
              placeholder="••••••••"
              required
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="rounded-md p-1.5 text-ink-subtle transition-colors hover:bg-sunken hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              }
            />

            <div className="flex items-center justify-between gap-3">
              <Checkbox
                label="Remember me"
                name="remember"
                checked={values.remember}
                onChange={setValue('remember')}
              />
              {/* Placeholder until password reset exists. */}
              <button
                type="button"
                className="text-sm text-brand-600 transition-colors hover:text-brand-700"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" fullWidth isLoading={isSubmitting}>
              Sign in
            </Button>
          </form>
        </div>

        {/* Removed once the real backend is wired up. */}
        <div className="mt-4 rounded-card bg-info-soft px-4 py-3 text-xs text-info-strong">
          <p className="font-medium">Demo mode</p>
          <p className="mt-1">
            {DEMO_CREDENTIALS.email} · {DEMO_CREDENTIALS.password}
          </p>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="mt-2 font-medium underline underline-offset-2"
          >
            Fill demo credentials
          </button>
        </div>
      </div>
    </main>
  )
}
