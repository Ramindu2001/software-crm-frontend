import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  FileText,
  Lock,
  PhoneCall,
  SearchX,
  TriangleAlert,
  Trophy,
} from 'lucide-react'
import { ApiErrorAlert, EmptyState, FullPageLoader } from '@/components/common'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { useAuth } from '@/features/auth'
import { formatDate } from '@/lib/format'
import { toast } from '@/lib/toastStore'
import { updateLeadStatus } from '../api'
import { useLead, useLookups } from '../hooks'
import { LEAD_LOST_REASON, LEAD_STATUS, isOpen } from '../constants'
import { LeadStatusBadge } from './LeadBadges'
import { LeadPipelineStepper } from './LeadPipelineStepper'
import { LeadVerdict } from './LeadVerdict'
import { LeadDetailsPanel } from './LeadDetailsPanel'
import { LeadNotesCard } from './LeadNotesCard'
import { LeadRequirements } from './LeadRequirements'
import { LeadActivityTimeline } from './LeadActivityTimeline'
import { LogActivityModal } from './LogActivityModal'
import { CloseLeadModal } from './CloseLeadModal'
import { ConvertLeadModal } from './ConvertLeadModal'

/**
 * The lead workspace.
 *
 * Everything a rep needs between the first call and the close, on one screen:
 * where it is in the pipeline, what they asked for, what has been said so far,
 * and the two ways this ends.
 *
 * Every mutation here returns the whole updated lead, so each handler swaps the
 * cached record via `applyLead` rather than refetching — seven endpoints, zero
 * follow-up reads.
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

          {/* The customer id rides along in the link. It used to point at a
              blank form, so the very first thing anybody did after winning a
              deal was re-pick the customer they had just created. */}
          {lead.customer && (
            <Button
              as={Link}
              to={`/quotations/new?customer=${lead.customer.id}`}
              size="sm"
            >
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

  // Only fetched for users who can act on them — a read-only viewer never opens
  // an editor, so two picker requests would be wasted.
  const { owners, products } = useLookups({
    owners: canManage,
    products: canManage,
  })

  const [dialog, setDialog] = useState(null)
  const [isMovingStage, setIsMovingStage] = useState(false)
  const [stageError, setStageError] = useState(null)

  if (isLoading && !lead) return <FullPageLoader />

  // EmptyState, not RouteFallback: the latter takes no props and renders only a
  // spinner, so passing it a title would leave this screen loading forever.
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

  const open = isOpen(lead)
  const canEdit = canManage && open

  const handleStageMove = async (status) => {
    setIsMovingStage(true)
    setStageError(null)

    try {
      applyLead(await updateLeadStatus(lead.id, status))
      toast.success('Stage updated', {
        description: `${lead.id} is now ${LEAD_STATUS[status]?.label ?? status}.`,
      })
    } catch (caught) {
      setStageError(caught)
    } finally {
      setIsMovingStage(false)
    }
  }

  const closeDialog = () => setDialog(null)

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

        {open && (
          <div className="flex flex-wrap items-center gap-2">
            {/* First, and not tucked into the timeline below: logging contact is
                the most frequent thing anybody does on this screen. */}
            {canManage && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDialog('activity')}
              >
                <PhoneCall className="size-4" aria-hidden="true" />
                Log contact
              </Button>
            )}
            {canManage && (
              <Button variant="ghost" size="sm" onClick={() => setDialog('lost')}>
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

      {/* The routing decision, at the top where it belongs — this is what
          decides whether the deal is a product sale or a build commitment. */}
      <LeadVerdict stats={lead.requirementStats} className="mb-5" />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {open && (
            <Card>
              <CardHeader>
                <CardTitle as="h2" className="text-sm">
                  Pipeline stage
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {stageError && <ApiErrorAlert error={stageError} />}
                <LeadPipelineStepper
                  status={lead.status}
                  canManage={canManage}
                  isMoving={isMovingStage}
                  onMove={handleStageMove}
                />
              </CardContent>
            </Card>
          )}

          <LeadRequirements
            lead={lead}
            products={products}
            canManage={canEdit}
            onChange={applyLead}
          />

          <LeadNotesCard
            lead={lead}
            field="requirementSummary"
            title="Notes from the calls"
            placeholder="Whatever they told you on the phone. Individual requirements are itemised above."
            canManage={canEdit}
            onChange={applyLead}
          />

          {/* Only on the path where a scope means anything — or where one has
              already been written, so nothing is ever hidden by a later change
              of solution type. */}
          {(lead.customScope || lead.solutionType === 'Custom Development') && (
            <LeadNotesCard
              lead={lead}
              field="customScope"
              title="Proposed custom scope"
              placeholder="What we would build, in enough detail to estimate it."
              canManage={canEdit}
              onChange={applyLead}
              badge={
                <Badge tone="brand" size="sm">
                  Custom development
                </Badge>
              }
            />
          )}

          <LeadActivityTimeline
            activities={lead.activities}
            canManage={canEdit}
            onLog={() => setDialog('activity')}
          />
        </div>

        <aside className="flex flex-col gap-5">
          {/* Says plainly why the controls are gone. Without it a closed lead
              just looks like a page whose buttons failed to render. */}
          {!open && (
            <Card>
              <CardContent className="flex items-start gap-2.5 p-4">
                <Lock className="mt-0.5 size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                <p className="text-xs text-ink-muted">
                  This lead is closed, so its details are read-only.
                  {lead.status === 'Won'
                    ? ' Changes now belong on the customer record it became.'
                    : ' Reopen it by moving it back to an open stage from the pipeline.'}
                </p>
              </CardContent>
            </Card>
          )}

          <LeadDetailsPanel
            lead={lead}
            owners={owners}
            products={products}
            canManage={canEdit}
            onChange={applyLead}
          />
        </aside>
      </div>

      {/* Mounted only while open, so each open starts from a clean form. */}
      {dialog === 'activity' && (
        <LogActivityModal
          lead={lead}
          onClose={closeDialog}
          onLogged={(updated) => {
            closeDialog()
            applyLead(updated)
            toast.success('Contact logged')
          }}
        />
      )}

      {dialog === 'lost' && (
        <CloseLeadModal
          lead={lead}
          onClose={closeDialog}
          onClosed={(updated) => {
            closeDialog()
            applyLead(updated)
            toast.success('Lead closed as lost', {
              description: 'The reason is recorded and will show up in loss reporting.',
            })
          }}
        />
      )}

      {dialog === 'convert' && (
        <ConvertLeadModal
          lead={lead}
          onClose={closeDialog}
          onConverted={(updated) => {
            closeDialog()
            applyLead(updated)
            toast.success('Lead won', {
              description: `${updated.customer?.name ?? 'The customer'} is now in the directory and can be quoted.`,
            })
          }}
        />
      )}
    </>
  )
}
