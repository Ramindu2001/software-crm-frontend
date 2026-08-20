import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
  Spinner,
} from '@/components/ui'
import { ApiErrorAlert } from '@/components/common'
import { cn } from '@/lib/utils'
import {
  addLeadRequirement,
  deleteLeadRequirement,
  updateLeadRequirement,
} from '../api'
import { REQUIREMENT_PRIORITY_OPTIONS } from '../constants'
import { RequirementPriorityBadge, RequirementStatusBadge } from './LeadBadges'
import { ConfirmDialog } from './ConfirmDialog'

/**
 * Requirement gathering, and the decision that falls out of it.
 *
 * Each row is one thing the prospect asked for, assessed as Covered (an
 * existing product does this) or Gap (nothing we sell does). The verdict those
 * rows add up to is rendered at the top of the page by <LeadVerdict>, because
 * it is a fact about the lead rather than a detail of this panel.
 *
 * ── What changed, and why ──
 * · Busy state is per row. A single panel-wide flag meant assessing one
 *   requirement froze the controls on every other one, so working through five
 *   of them was five sequential lockouts rather than five quick decisions.
 * · Deleting asks first. It is a hard delete with no restore, and it sat behind
 *   an unguarded icon in a row of controls people click freely.
 * · The text itself is editable. The API has always accepted `requirement` on
 *   PATCH; the UI simply never offered it, so a typo meant deleting the row and
 *   retyping it — losing its assessment along the way.
 */

/**
 * One requirement, with its assessment inline.
 *
 * The product picker appears only once the row is marked Covered — asking
 * "which product covers this?" about a gap is a question with no answer, and
 * the server clears the link on any other status anyway.
 */
function RequirementRow({
  requirement,
  products,
  canManage,
  isBusy,
  onAssess,
  onRename,
  onRemove,
}) {
  const [draft, setDraft] = useState(null)

  const isEditing = draft !== null

  const commit = () => {
    const text = draft?.trim() ?? ''
    setDraft(null)
    if (text.length >= 3 && text !== requirement.requirement) {
      onRename(requirement, text)
    }
  }

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-2">
        {isEditing ? (
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commit()
              }
              if (event.key === 'Escape') setDraft(null)
            }}
            aria-label={`Edit requirement: ${requirement.requirement}`}
            wrapperClassName="flex-1"
            className="h-8 text-sm"
            autoFocus
          />
        ) : (
          <p className="min-w-0 flex-1 text-sm text-ink">{requirement.requirement}</p>
        )}

        <span className="flex shrink-0 items-center gap-0.5">
          {isBusy && <Spinner className="mr-1 text-ink-subtle" />}

          {canManage && !isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDraft(requirement.requirement)}
                disabled={isBusy}
                aria-label={`Edit requirement: ${requirement.requirement}`}
                className="text-ink-subtle hover:text-ink"
              >
                <Pencil className="size-3.5" aria-hidden="true" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(requirement)}
                disabled={isBusy}
                aria-label={`Remove requirement: ${requirement.requirement}`}
                className="text-ink-subtle hover:text-danger-strong"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </>
          )}
        </span>
      </div>

      <div className={cn('flex flex-wrap items-center gap-2', isBusy && 'opacity-60')}>
        <RequirementPriorityBadge priority={requirement.priority} />

        {canManage ? (
          <>
            <Select
              value={requirement.status}
              onChange={(event) => onAssess(requirement, { status: event.target.value })}
              options={[
                { value: 'Open', label: 'Not assessed' },
                { value: 'Covered', label: 'Covered by a product' },
                { value: 'Gap', label: 'Gap — needs building' },
              ]}
              aria-label={`Assessment for: ${requirement.requirement}`}
              disabled={isBusy}
              wrapperClassName="w-52"
              className="h-8 text-xs"
            />

            {requirement.status === 'Covered' && (
              <Select
                value={requirement.coveredByProduct?.id ?? ''}
                onChange={(event) =>
                  onAssess(requirement, {
                    status: 'Covered',
                    coveredByProductId: event.target.value,
                  })
                }
                options={products}
                placeholder="Which product?"
                aria-label={`Product covering: ${requirement.requirement}`}
                disabled={isBusy}
                wrapperClassName="w-52"
                className="h-8 text-xs"
              />
            )}
          </>
        ) : (
          <>
            <RequirementStatusBadge status={requirement.status} />
            {requirement.coveredByProduct && (
              <span className="text-xs text-ink-subtle">
                via {requirement.coveredByProduct.name}
              </span>
            )}
          </>
        )}
      </div>
    </li>
  )
}

/**
 * @param {object} props
 * @param {object} props.lead
 * @param {Array<{value: string, label: string}>} props.products
 * @param {boolean} props.canManage
 * @param {(lead: object) => void} props.onChange Receives the updated lead.
 */
export function LeadRequirements({ lead, products, canManage, onChange }) {
  const [draft, setDraft] = useState('')
  const [priority, setPriority] = useState('Must Have')
  const [isAdding, setIsAdding] = useState(false)
  /** The id of the single row currently mid-request, or null. */
  const [busyId, setBusyId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [error, setError] = useState(null)

  /**
   * Every one of these endpoints answers with the whole updated lead, so the
   * caller swaps its cached record rather than refetching.
   */
  const run = async (operation, { rowId } = {}) => {
    if (rowId) setBusyId(rowId)
    setError(null)

    try {
      onChange(await operation())
      return true
    } catch (caught) {
      setError(caught)
      return false
    } finally {
      if (rowId) setBusyId(null)
    }
  }

  const handleAdd = async (event) => {
    event.preventDefault()
    if (draft.trim().length < 3) return

    setIsAdding(true)
    const ok = await run(() =>
      addLeadRequirement(lead.id, { requirement: draft, priority }),
    )
    setIsAdding(false)
    if (ok) setDraft('')
  }

  const handleAssess = (requirement, changes) =>
    run(
      () =>
        updateLeadRequirement(lead.id, requirement.id, {
          status: changes.status,
          coveredByProductId:
            changes.coveredByProductId ?? requirement.coveredByProduct?.id ?? '',
        }),
      { rowId: requirement.id },
    )

  const handleRename = (requirement, text) =>
    run(
      () =>
        updateLeadRequirement(lead.id, requirement.id, {
          requirement: text,
          status: requirement.status,
          coveredByProductId: requirement.coveredByProduct?.id ?? '',
        }),
      { rowId: requirement.id },
    )

  const handleDelete = async () => {
    const target = pendingDelete
    const ok = await run(() => deleteLeadRequirement(lead.id, target.id), {
      rowId: target.id,
    })
    if (ok) setPendingDelete(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-sm">
          What they need
          {lead.requirements.length > 0 && (
            <span className="ml-1.5 text-ink-subtle">({lead.requirements.length})</span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {error && <ApiErrorAlert error={error} />}

        {lead.requirements.length === 0 ? (
          <p className="text-sm text-ink-subtle italic">
            Nothing itemised yet. Add what they asked for, one line at a time, then
            mark each one covered or a gap — that is what decides whether this is an
            off-the-shelf sale or a custom build.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {lead.requirements.map((requirement) => (
              <RequirementRow
                key={requirement.id}
                requirement={requirement}
                products={products}
                canManage={canManage}
                isBusy={busyId === requirement.id}
                onAssess={handleAssess}
                onRename={handleRename}
                onRemove={setPendingDelete}
              />
            ))}
          </ul>
        )}

        {canManage && (
          <form
            onSubmit={handleAdd}
            className="flex flex-wrap items-end gap-2 border-t border-line pt-4"
          >
            <Input
              label="Add a requirement"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="e.g. Stock transfers between outlets"
              disabled={isAdding}
              wrapperClassName="min-w-48 flex-1"
            />
            <Select
              label="Priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              options={REQUIREMENT_PRIORITY_OPTIONS}
              disabled={isAdding}
              wrapperClassName="w-40"
            />
            <Button
              type="submit"
              isLoading={isAdding}
              disabled={isAdding || draft.trim().length < 3}
            >
              {!isAdding && <Plus className="size-4" aria-hidden="true" />}
              Add
            </Button>
          </form>
        )}
      </CardContent>

      {pendingDelete && (
        <ConfirmDialog
          title="Remove this requirement?"
          description={`"${pendingDelete.requirement}" will be deleted along with its assessment. This cannot be undone.`}
          confirmLabel="Remove"
          isBusy={busyId === pendingDelete.id}
          onConfirm={handleDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </Card>
  )
}
