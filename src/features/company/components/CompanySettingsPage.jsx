import { useRef, useState } from 'react'
import { Building2, ImageOff, TriangleAlert, Upload } from 'lucide-react'
import { ApiErrorAlert, EmptyState, RouteFallback } from '@/components/common'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
} from '@/components/ui'
import { PERMISSIONS, useAuth } from '@/features/auth'
import { toast } from '@/lib/toastStore'
import {
  deleteCompanyLogo,
  logoUrl,
  updateCompanySettings,
  uploadCompanyLogo,
} from '../api'
import { useCompanySettings } from '../hooks/useCompanySettings'

/**
 * Company letterhead and default quotation terms.
 *
 * Rendered inside the Settings shell, so it has no PageHeader of its own.
 *
 * Everything here appears on every quotation. Two different lifetimes are at
 * play, and the copy says so, because getting them confused is the one way to
 * damage an issued document:
 *
 *   - letterhead (name, address, phone, logo) is read LIVE, so a change here
 *     updates every quotation at once, including ones raised last month
 *   - default terms are COPIED onto a quotation when it is created, so
 *     changing them affects new quotations only
 */

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export function CompanySettingsPage() {
  const { settings, isLoading, error, refresh, applySettings } = useCompanySettings()
  const { can } = useAuth()
  const canManage = can(PERMISSIONS.COMPANY_MANAGE)

  const fileInputRef = useRef(null)
  const [values, setValues] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // Seed the form once the settings arrive, adjusted during render rather than
  // in an effect — React's documented pattern for "reset state when a prop
  // changes". It renders once with the loaded values instead of painting an
  // empty form and replacing it. Keyed on object identity, so a refresh
  // re-seeds but typing is never clobbered mid-edit.
  const [seededFrom, setSeededFrom] = useState(null)
  if (settings && seededFrom !== settings) {
    setSeededFrom(settings)
    setValues(settings)
  }

  if (isLoading || !values) return <RouteFallback />

  if (error) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn't load company details"
        description={error.message ?? 'Something went wrong fetching company settings.'}
        action={
          <Button size="sm" onClick={refresh}>
            Try again
          </Button>
        }
      />
    )
  }

  const setValue = (key) => (event) => {
    const { value } = event.target
    setValues((current) => ({ ...current, [key]: value }))
    setSaveError(null)
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setSaveError(null)

    try {
      const saved = await updateCompanySettings(values)
      applySettings(saved)
      toast.success('Company details saved', {
        description: 'New quotations will use these details.',
      })
    } catch (caught) {
      setSaveError(caught)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoPick = async (event) => {
    const file = event.target.files?.[0]
    // Reset immediately so picking the same file twice still fires a change.
    event.target.value = ''
    if (!file) return

    // Checked here as well as server-side so the user is told before a 2MB
    // upload travels and comes back rejected.
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Unsupported image', {
        description: 'Use a PNG, JPEG, WebP or SVG file.',
      })
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Image is too large', { description: 'Use a file of 2MB or smaller.' })
      return
    }

    setIsUploading(true)
    try {
      const saved = await uploadCompanyLogo(file)
      applySettings(saved)
      setValues((current) => ({ ...current, logoPath: saved.logoPath }))
      toast.success('Logo updated', {
        description: 'It now appears on every quotation.',
      })
    } catch (caught) {
      toast.error('Could not upload the logo', { description: caught.message })
    } finally {
      setIsUploading(false)
    }
  }

  const handleLogoRemove = async () => {
    setIsUploading(true)
    try {
      const saved = await deleteCompanyLogo()
      applySettings(saved)
      setValues((current) => ({ ...current, logoPath: '' }))
      toast.info('Logo removed')
    } catch (caught) {
      toast.error('Could not remove the logo', { description: caught.message })
    } finally {
      setIsUploading(false)
    }
  }

  const resolvedLogo = logoUrl(values.logoPath)

  return (
    <form onSubmit={handleSave} className="grid max-w-3xl gap-5">
      <div>
        <h2 className="text-base font-semibold text-ink">Company details</h2>
        <p className="text-sm text-ink-muted">
          The letterhead and default terms used on every quotation.
        </p>
      </div>

      <ApiErrorAlert error={saveError} fallback="Could not save the company details." />

      <Card>
        <CardHeader>
          <CardTitle>Letterhead</CardTitle>
          <CardDescription>
            Read live when a quotation is opened, so a change here updates every
            quotation at once — including ones raised earlier.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-sunken">
              {resolvedLogo ? (
                <img
                  src={resolvedLogo}
                  alt="Company logo"
                  className="size-full object-contain p-1.5"
                />
              ) : (
                <ImageOff className="size-6 text-ink-subtle" aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Logo</p>
              <p className="mb-2 text-xs text-ink-muted">
                PNG, JPEG, WebP or SVG · up to 2MB · shown top-right on the quotation.
              </p>

              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED.join(',')}
                    onChange={handleLogoPick}
                    className="sr-only"
                    // Labelled by the button that triggers it, since the native
                    // control is hidden.
                    aria-label="Choose a logo image"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={isUploading}
                  >
                    <Upload className="mr-1.5 size-4" aria-hidden="true" />
                    {resolvedLogo ? 'Replace' : 'Upload'}
                  </Button>

                  {resolvedLogo && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleLogoRemove}
                      disabled={isUploading}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <Input
            label="Company name"
            value={values.companyName}
            onChange={setValue('companyName')}
            disabled={!canManage}
            required
          />

          <Textarea
            label="Address"
            value={values.address}
            onChange={setValue('address')}
            rows={2}
            disabled={!canManage}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Phone"
              value={values.phone}
              onChange={setValue('phone')}
              placeholder="011 255 9466 | 0743935716"
              disabled={!canManage}
            />
            <Input
              label="Email"
              type="email"
              value={values.email}
              onChange={setValue('email')}
              disabled={!canManage}
            />
            <Input
              label="Website"
              value={values.website}
              onChange={setValue('website')}
              placeholder="synnexit.com"
              disabled={!canManage}
            />
            <Input
              label="Quotation validity"
              type="number"
              min="1"
              max="365"
              value={values.quotationValidityDays}
              onChange={setValue('quotationValidityDays')}
              hint="Days before a new quotation expires."
              disabled={!canManage}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default terms</CardTitle>
          <CardDescription>
            Copied onto each new quotation, where they stay editable. Changing them
            here affects new quotations only — quotations already issued keep the
            terms they were sent with.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <Textarea
            label="Payment terms"
            value={values.paymentTerms}
            onChange={setValue('paymentTerms')}
            rows={2}
            disabled={!canManage}
          />
          <Textarea
            label="Terms &amp; conditions"
            value={values.termsConditions}
            onChange={setValue('termsConditions')}
            rows={12}
            hint="One clause per line. Numbering is yours to keep consistent."
            disabled={!canManage}
          />
        </CardContent>

        {canManage && (
          <CardFooter>
            <Button size="sm" type="submit" isLoading={isSaving}>
              Save changes
            </Button>
          </CardFooter>
        )}
      </Card>

      {!canManage && (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <Building2 className="size-4" aria-hidden="true" />
          Only an administrator can change these details.
        </p>
      )}
    </form>
  )
}
