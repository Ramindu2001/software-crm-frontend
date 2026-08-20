import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Ban, FileText, SearchX, Trophy, TriangleAlert } from 'lucide-react'
import { EmptyState, FullPageLoader } from '@/components/common'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
} from '@/components/ui'
import { useAuth } from '@/features/auth'
import { formatDate } from '@/lib/format'
import { toast } from '@/lib/toastStore'
import { updateLeadStatus } from '../api'
import { useLead, useLookups } from '../hooks'
import {
  LEAD_LOST_REASON,
  LEAD_STATUS,
  OPEN_STATUS_OPTIONS,
  isOpen,
} from '../constants'
import { LeadStatusBadge } from './LeadBadges'
import { LeadDetailsPanel } from './LeadDetailsPanel'
import { LeadRequirements } from './LeadRequirements'
import { LeadActivityTimeline } from './LeadActivityTimeline'
import { LogActivityModal } from './LogActivityModal'
import { CloseLeadModal } from './CloseLeadModal'
import { ConvertLeadModal } from './ConvertLeadModal'

/**
 * The lead workspace.
 *
 * Everything a rep needs between the first call and the close, on one screen:
 * what they asked for, what has been said so far, and the two ways this ends.
 *
 * Every mutation here returns the whole updated lead, so each handler swaps
 * the cached record via `applyLead` rather than refetching — six endpoints,
 * zero follow-up reads.
 */

/** Shown once the lead is closed, in place of the working controls. */
function Outcome({ lead }) {
  if (lead.status === 'Won') {
    return (
      <Card className="bg-success-soft">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-success-strong">
              Won{lead.closedAt && ` on ${formatDate(lead.closedAt)}`}
            </p>
            <p className="mt-0.5 text-xs text-success-strong/90">
              Converted to {lead.customer?.name ?? 'a customer'}. Quotations and
              agreements are raised against that customer record.
            </p>
          </div>
          {lead.customer && (
            <Button as={Link} to="/quotations/new" size="sm">
              <FileText className="size-4" aria-hidden="true" />
              Raise a quotation
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-danger-soft">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-danger-strong">
          Lost{lead.closedAt && ` on ${formatDate(lead.closedAt)}`}
          {lead.lostReason &&
            ` — ${LEAD_LOST_REASON[lead.lostReason]?.label ?? lead.lostReason}`}
        </p>
        {lead.lostNotes && (
          <p className="mt-1 text-xs whitespace-pre-line text-danger-strong/90">
            {lead.lostNotes}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function LeadDetailPage() {
  const { leadId } = useParams()
  const { lead, isLoading, error, isNotFound, refresh, applyLead } = useLead(leadId)

  const { can } = useAuth()
  const canManage = can('leads:manage')
  const canConvert = can('leads:convert')

  // Only fetched for users who can act on them — a read-only viewer never
  // opens the edit form, so two picker requests would be wasted.
  const { owners, products } = useLookups({
    owners: canManage,
    products: canManage,
  })

  const [dialog, setDialog] = useState(null)
  const [isMovingStage, setIsMovingStage] = useState(false)
  const [stageError, setStageError] = useState(null)

  if (isLoading && !lead) return <FullPageLoader />

  // EmptyState, not RouteFallback: the latter takes no props and renders only
  // a spinner, so passing it a title would leave this screen loading forever.
  if (isNotFound) {
    return (
      <EmptyState
        icon={SearchX}
        title="Lead not found"
        description={`We couldn't find a lead with the reference ${leadId}. It may have been removed.`}
        action={
          <Button as={Link} to="/leads" size="sm">
            Back to leads
          </Button>
        }
      />
    )
  }

  if (error || !lead) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Couldn't load this lead"
        description={error?.message ?? 'Something went wrong.'}
        action={
          <Button size="sm" onClick={refresh}>
            Try again
          </Button>
        }
      />
    )
  }

  const handleStageChange = async (event) => {
    const status = event.target.value
    setIsMovingStage(true)
    setStageError(null)

    try {
      const updated = await updateLeadStatus(lead.id, status)
      applyLead(updated)
      toast.success('Stage updated', {
        description: `${lead.id} is now ${LEAD_STATUS[status]?.label ?? status}.`,
      })
    } catch (caught) {
      setStageError(caught.message ?? 'Could not move the lead.')
    } finally {
      setIsMovingStage(false)
    }
  }

  const handleClosed = (updated) => {
    setDialog(null)
    applyLead(updated)
    toast.success('Lead closed as lost', {
      description: 'The reason is recorded and will show up in loss reporting.',
    })
  }

  const handleConverted = (updated) => {
    setDialog(null)
    applyLead(updated)
    toast.success('Lead won', {
      description: `${updated.customer?.name ?? 'The customer'} is now in the directory and can be quoted.`,
    })
  }

  const handleLogged = (updated) => {
    setDialog(null)
    applyLead(updated)
    toast.success('Contact logged')
  }

  const open = isOpen(lead)

  return (
    <>
      <Link
        to="/leads"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to leads
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-ink-subtle">{lead.id}</span>
            <LeadStatusBadge status={lead.status} />
          </div>
          <h1 className="mt-2 truncate text-2xl font-semibold text-ink">
            {lead.contactName}
          </h1>
          {lead.companyName && (
            <p className="mt-0.5 text-sm text-ink-muted">{lead.companyName}</p>
          )}
        </div>

        {/* The two ways a lead ends, offered only while it is still live. */}
        {open && (
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <Button variant="secondary" size="sm" onClick={() => setDialog('lost')}>
                <Ban className="size-4" aria-hidden="true" />
                Close as lost
              </Button>
            )}
            {canConvert && (
              <Button size="sm" onClick={() => setDialog('convert')}>
                <Trophy className="size-4" aria-hidden="true" />
                Mark as won
              </Button>
            )}
          </div>
        )}
      </div>

      {!open && (
        <div className="mb-5">
          <Outcome lead={lead} />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* The stage control sits above the requirements, because moving the
              lead is the thing a rep does most often on this screen. */}
          {open && canManage && (
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="text-sm">
                  Pipeline stage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  label="Stage"
                  value={lead.status}
                  onChange={handleStageChange}
                  options={OPEN_STATUS_OPTIONS}
                  disabled={isMovingStage}
                  error={stageError ?? undefined}
                  hint={LEAD_STATUS[lead.status]?.hint}
                />
              </CardContent>
            </Card>
          )}

          <LeadRequirements
            lead={lead}
            products={products}
            canManage={canManage && open}
            onChange={applyLead}
          />

          {/* Free-text capture from the calls, kept alongside the itemised
              requirements — a rep types a paragraph first and itemises after. */}
          {lead.requirementSummary && (
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="text-sm">
                  Notes from the calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-line text-ink-muted">
                  {lead.requirementSummary}
                </p>
              </CardContent>
            </Card>
          )}

          {lead.customScope && (
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="text-sm">
                  Proposed custom scope
                  <Badge tone="brand" size="sm" className="ml-2">
                    Custom development
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-line text-ink-muted">
                  {lead.customScope}
                </p>
              </CardContent>
            </Card>
          )}

          <LeadActivityTimeline
            activities={lead.activities}
            canManage={canManage && open}
            onLog={() => setDialog('activity')}
          />
        </div>

        <aside>
          <LeadDetailsPanel
            lead={lead}
            owners={owners}
            products={products}
            canManage={canManage && open}
            onChange={applyLead}
          />
        </aside>
      </div>

      {/* Mounted only while open, so each open starts from a clean form. */}
      {dialog === 'activity' && (
        <LogActivityModal
          lead={lead}
          onClose={() => setDialog(null)}
          onLogged={handleLogged}
        />
      )}
      {dialog === 'lost' && (
        <CloseLeadModal
          lead={lead}
          onClose={() => setDialog(null)}
          onClosed={handleClosed}
        />
      )}
      {dialog === 'convert' && (
        <ConvertLeadModal
          lead={lead}
          onClose={() => setDialog(null)}
          onConverted={handleConverted}
        />
      )}
    </>
  )
}
