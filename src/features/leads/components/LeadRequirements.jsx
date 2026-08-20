import { useState } from 'react'
import { Check, CircleHelp, Plus, Trash2, TriangleAlert } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
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

/**
 * Requirement gathering, and the decision that falls out of it.
 *
 * Each row is one thing the prospect asked for, assessed as Covered (an
 * existing product does this) or Gap (nothing we sell does). The verdict strip
 * at the top is derived from those rows, not stored: no gaps means an
 * off-the-shelf sale, any gap means this is a custom-development conversation.
 *
 * That is deliberately the only place the system decides between the two
 * paths. A rep can still set the solution type by hand on the details panel —
 * sometimes you know before you have itemised anything — but this panel is
 * what makes the answer defensible rather than a hunch.
 */

/** The three states of the verdict strip, keyed by `fitsExistingProduct`. */
const VERDICTS = {
  true: {
    icon: Check,
    tone: 'bg-success-soft text-success-strong',
    title: 'An existing product covers this',
    body: 'Every requirement recorded is met by something in the catalogue. Offer the product.',
  },
  false: {
    icon: TriangleAlert,
    tone: 'bg-warning-soft text-warning-strong',
    title: 'Custom development would be needed',
    body: 'Some requirements are not met by anything we sell. Quote for custom work only if there is capacity to build it.',
  },
  null: {
    icon: CircleHelp,
    tone: 'bg-neutral-soft text-neutral-strong',
    title: 'Not assessed yet',
    body: 'Add what they asked for, then mark each one covered or a gap to decide what to offer.',
  },
}

function Verdict({ stats }) {
  const verdict = VERDICTS[String(stats.fitsExistingProduct)]
  const Icon = verdict.icon

  return (
    <div className={cn('flex items-start gap-3 rounded-lg px-3 py-2.5', verdict.tone)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-medium">{verdict.title}</p>
        <p className="mt-0.5 text-xs opacity-90">{verdict.body}</p>
        {stats.total > 0 && (
          <p className="mt-1.5 text-xs tabular-nums opacity-90">
            {stats.total} recorded · {stats.covered} covered · {stats.gaps} gap
            {stats.gaps === 1 ? '' : 's'}
            {stats.open > 0 && ` · ${stats.open} unassessed`}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * One requirement, with its assessment inline.
 *
 * The product picker appears only once the row is marked Covered — asking
 * "which product covers this?" about a gap is a question with no answer, and
 * the server clears the link on any other status anyway.
 */
function RequirementRow({ requirement, products, canManage, onAssess, onRemove, isBusy }) {
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 text-sm text-ink">{requirement.requirement}</p>
        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(requirement)}
            disabled={isBusy}
            aria-label={`Remove requirement: ${requirement.requirement}`}
            className="shrink-0 text-ink-subtle hover:text-danger-strong"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState(null)

  // Every one of these endpoints answers with the whole updated lead, so the
  // caller swaps its cached record rather than refetching.
  const run = async (operation) => {
    setIsBusy(true)
    setError(null)
    try {
      onChange(await operation())
      return true
    } catch (caught) {
      setError(caught)
      return false
    } finally {
      setIsBusy(false)
    }
  }

  const handleAdd = async (event) => {
    event.preventDefault()
    if (draft.trim().length < 3) return

    const ok = await run(() =>
      addLeadRequirement(lead.id, { requirement: draft, priority }),
    )
    if (ok) setDraft('')
  }

  const handleAssess = (requirement, changes) =>
    run(() =>
      updateLeadRequirement(lead.id, requirement.id, {
        status: changes.status,
        coveredByProductId:
          changes.coveredByProductId ?? requirement.coveredByProduct?.id ?? '',
      }),
    )

  const handleRemove = (requirement) =>
    run(() => deleteLeadRequirement(lead.id, requirement.id))

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
        <Verdict stats={lead.requirementStats} />

        {error && <ApiErrorAlert error={error} />}

        {lead.requirements.length > 0 && (
          <ul className="divide-y divide-line">
            {lead.requirements.map((requirement) => (
              <RequirementRow
                key={requirement.id}
                requirement={requirement}
                products={products}
                canManage={canManage}
                onAssess={handleAssess}
                onRemove={handleRemove}
                isBusy={isBusy}
              />
            ))}
          </ul>
        )}

        {canManage && (
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
            <Input
              label="Add a requirement"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="e.g. Stock transfers between outlets"
              disabled={isBusy}
              wrapperClassName="min-w-48 flex-1"
            />
            <Select
              label="Priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              options={REQUIREMENT_PRIORITY_OPTIONS}
              disabled={isBusy}
              wrapperClassName="w-40"
            />
            <Button type="submit" disabled={isBusy || draft.trim().length < 3}>
              <Plus className="size-4" aria-hidden="true" />
              Add
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
