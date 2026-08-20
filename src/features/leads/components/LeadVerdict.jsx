import { Check, CircleHelp, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Can we sell them something we already have, or does this need building?
 *
 * ── Why this is a page-level strip ──
 * This is the single most consequential fact about a lead — it decides whether
 * the deal is an off-the-shelf sale or a commitment of development capacity the
 * company may not have. It used to be rendered inside the requirements card,
 * below its header, roughly two thirds of the way down the page. Somebody
 * scanning the lead to answer "what are we actually offering here?" had to go
 * looking for it.
 *
 * ── Why it is computed, never stored ──
 * The server derives it from the requirement rows on every read: `gaps === 0`.
 * A denormalised "needs_custom_work" column would eventually disagree with the
 * rows underneath it, and the rows are the thing anybody would actually trust.
 *
 * `fitsExistingProduct` is null until something has been assessed. "No gaps"
 * over an empty list is an absence of evidence rather than a finding, so the
 * third state says so plainly instead of claiming a fit nobody has checked.
 */

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

/**
 * @param {object} props
 * @param {object} props.stats requirementStats from the lead.
 * @param {string} [props.className]
 */
export function LeadVerdict({ stats, className }) {
  const verdict = VERDICTS[String(stats.fitsExistingProduct)]
  const Icon = verdict.icon

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card px-4 py-3',
        verdict.tone,
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{verdict.title}</p>
          <p className="mt-0.5 text-xs opacity-90">{verdict.body}</p>
        </div>
      </div>

      {stats.total > 0 && (
        <p className="shrink-0 text-xs tabular-nums opacity-90">
          {stats.total} recorded · {stats.covered} covered · {stats.gaps} gap
          {stats.gaps === 1 ? '' : 's'}
          {stats.open > 0 && ` · ${stats.open} unassessed`}
        </p>
      )}
    </div>
  )
}
