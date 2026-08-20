import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { ApiErrorAlert } from '@/components/common'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
} from '@/components/ui'
import { updateLead } from '../api'

/**
 * One long-text field, read in place and edited in place.
 *
 * ── Why these two fields get their own card ──
 * `requirement_summary` is the paragraph a rep types after the first call, and
 * `custom_scope` is what we would build if this becomes a custom job. Both are
 * prose, both are read far more often than the short fields beside them, and
 * both were previously read-only here while being editable only from inside the
 * details panel's twelve-field form. So a user looking straight at the notes,
 * wanting to add a line, had no way to do it from where they were standing.
 *
 * Empty is still rendered when the user can edit, because an absent card is an
 * absent affordance: "there is nowhere to write the scope down" is exactly the
 * wrong message on a lead heading for custom development.
 *
 * @param {object} props
 * @param {object} props.lead
 * @param {'requirementSummary'|'customScope'} props.field
 * @param {string} props.title
 * @param {string} props.placeholder
 * @param {boolean} props.canManage
 * @param {(lead: object) => void} props.onChange
 * @param {React.ReactNode} [props.badge] Rendered beside the title.
 */
export function LeadNotesCard({
  lead,
  field,
  title,
  placeholder,
  canManage,
  onChange,
  badge,
}) {
  const current = lead[field] ?? ''

  const [draft, setDraft] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  const isEditing = draft !== null

  // Nothing written and nothing to write it with — the card would be an empty
  // heading, so it stays out of the layout entirely.
  if (!current && !canManage) return null

  const save = async () => {
    if (draft === current) {
      setDraft(null)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      onChange(await updateLead(lead.id, { [field]: draft }))
      setDraft(null)
    } catch (caught) {
      setError(caught)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle as="h2" className="flex items-center gap-2 text-sm">
          {title}
          {badge}
        </CardTitle>

        {canManage && !isEditing && (
          <Button variant="ghost" size="sm" onClick={() => setDraft(current)}>
            <Pencil className="size-3.5" aria-hidden="true" />
            {current ? 'Edit' : 'Add'}
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-3">
            <ApiErrorAlert error={error} />
          </div>
        )}

        {isEditing ? (
          <div className="flex flex-col gap-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                // Enter inserts a newline here — this is prose, not a one-liner
                // — so Escape is the quick way out and saving is explicit.
                if (event.key === 'Escape') setDraft(null)
              }}
              aria-label={title}
              placeholder={placeholder}
              rows={5}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={save} isLoading={isSaving} disabled={isSaving}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDraft(null)}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : current ? (
          <p className="text-sm leading-relaxed whitespace-pre-line text-ink-muted">
            {current}
          </p>
        ) : (
          <p className="text-sm text-ink-subtle italic">{placeholder}</p>
        )}
      </CardContent>
    </Card>
  )
}
