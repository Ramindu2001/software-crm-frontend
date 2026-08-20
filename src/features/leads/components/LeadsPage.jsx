import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Columns3,
  List,
  SearchX,
  TriangleAlert,
  UserPlus,
} from 'lucide-react'
import { EmptyState, PageHeader } from '@/components/common'
import { Button, Pagination } from '@/components/ui'
import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toastStore'
import { updateLeadStatus } from '../api'
import {
  useLeadBoard,
  useLeadFilters,
  useLeadStats,
  useLeads,
  useLookups,
} from '../hooks'
import { LEAD_STATUS } from '../constants'
import { LeadFilters } from './LeadFilters'
import { LeadWorkQueue } from './LeadWorkQueue'
import { LeadsTable } from './LeadsTable'
import { LeadBoardView } from './LeadBoardView'
import { CaptureLeadModal } from './CaptureLeadModal'
import { LogActivityModal } from './LogActivityModal'
import { CloseLeadModal } from './CloseLeadModal'
import { ConvertLeadModal } from './ConvertLeadModal'

/**
 * The pipeline, in whichever shape suits the job.
 *
 * ── Two views, one state ──
 * The board and the list read the same filters, the same owner scope and the
 * same search — all of it held in the URL — so switching views never loses your
 * place, and a link someone pastes opens on the view they were looking at.
 * Only the active view fetches; the other costs nothing until it is asked for.
 *
 * ── Why the dialogs live here rather than on the detail page ──
 * Logging a call is the most frequent action in the module and it used to cost
 * three navigations. Every dialog the detail page offers is reachable from a
 * row or a card, operating on the lead in place. The board's Won and Lost drop
 * zones route here too, which is what lets a drag satisfy API rules a drag
 * could never express on its own.
 */

const VIEWS = [
  { value: 'list', label: 'List', icon: List },
  { value: 'board', label: 'Board', icon: Columns3 },
]

function ViewToggle({ view, onChange }) {
  return (
    <div
      role="group"
      aria-label="View"
      className="inline-flex rounded-lg bg-sunken p-0.5 ring-1 ring-line"
    >
      {VIEWS.map((entry) => {
        const isActive = view === entry.value

        return (
          <button
            key={entry.value}
            type="button"
            onClick={() => onChange(entry.value)}
            aria-pressed={isActive}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
              isActive
                ? 'bg-surface text-ink shadow-card'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            <entry.icon className="size-4" aria-hidden="true" />
            {entry.label}
          </button>
        )
      })}
    </div>
  )
}

export function LeadsPage() {
  const navigate = useNavigate()
  const { can, user } = useAuth()

  const canCreate = can('leads:create')
  const canManage = can('leads:manage')
  const canConvert = can('leads:convert')

  const {
    filters,
    request,
    setFilter,
    resetFilters,
    hasActiveFilters,
    sort,
    toggleSort,
    page,
    setPage,
    view,
    setView,
  } = useLeadFilters()

  const isBoard = view === 'board'

  const list = useLeads({ request, sort, page, enabled: !isBoard })
  const board = useLeadBoard({ request, enabled: isBoard })

  // Scoped to the same owner as the list, so "My leads" narrows the counters
  // too rather than reporting the whole team's pipeline above a filtered view.
  const { stats, refresh: refreshStats } = useLeadStats({
    ownerId: request.ownerId,
  })

  const { owners } = useLookups({ owners: true })

  /** `{ type, lead }` — one dialog at a time, mounted only while open. */
  const [dialog, setDialog] = useState(null)
  const closeDialog = () => setDialog(null)

  const active = isBoard ? board : list

  /** Put a mutation's result back wherever the lead is currently rendered. */
  const applyUpdate = (updated) => {
    isBoard ? board.replaceLead(updated) : list.applyLead(updated)
    refreshStats()
  }

  /** A lead that has just closed is no longer live work. */
  const applyClosure = (updated) => {
    if (isBoard) board.removeLead(updated.leadId)
    else list.refresh()
    refreshStats()
  }

  const handleMoveStage = async (lead, status) => {
    try {
      if (isBoard) {
        // Optimistic: the card lands before the request resolves, and rolls
        // back to its old column if the server refuses.
        await board.moveLead(lead, status)
      } else {
        list.applyLead(await updateLeadStatus(lead.id, status))
      }
      refreshStats()
      toast.success('Stage updated', {
        description: `${lead.contactName} is now ${LEAD_STATUS[status]?.label ?? status}.`,
      })
    } catch (error) {
      toast.error('Could not move the lead', {
        description: error.message ?? 'The stage change was not saved.',
      })
    }
  }

  const on = {
    logContact: (lead) => setDialog({ type: 'activity', lead }),
    moveStage: handleMoveStage,
    convert: (lead) => setDialog({ type: 'convert', lead }),
    closeLost: (lead) => setDialog({ type: 'lost', lead }),
    open: (lead) => navigate(`/leads/${lead.id}`),
  }

  const handleCreated = (lead) => {
    closeDialog()
    // Refetch rather than splicing the row in: active filters may exclude it,
    // and the pipeline counters have moved too.
    isBoard ? board.refresh() : list.refresh()
    refreshStats()
    // Naming the lead matters — the current filters may hide it, so the toast
    // is sometimes the only confirmation the user gets.
    toast.success('Lead captured', {
      description: `${lead.id} · ${lead.contactName}`,
    })
  }

  const isEmpty =
    !active.isLoading &&
    (isBoard ? board.total === 0 : list.leads.length === 0)

  const rangeStart = list.filteredTotal === 0 ? 0 : (page - 1) * list.perPage + 1
  const rangeEnd = Math.min(page * list.perPage, list.filteredTotal)

  const summary = active.error
    ? null
    : isBoard
      ? `${board.total} open ${board.total === 1 ? 'lead' : 'leads'}`
      : list.filteredTotal === 0
        ? '0 leads'
        : `Showing ${rangeStart}–${rangeEnd} of ${list.filteredTotal}`

  return (
    <>
      <PageHeader
        description="Track enquiries from the first phone call through to a won deal or a recorded loss."
        actions={
          <>
            <ViewToggle view={view} onChange={setView} />
            {canCreate && (
              <Button size="sm" onClick={() => setDialog({ type: 'capture' })}>
                <UserPlus className="size-4" aria-hidden="true" />
                Capture lead
              </Button>
            )}
          </>
        }
      />

      <LeadWorkQueue
        stats={stats}
        activeFollowUp={filters.followUp}
        onFollowUpChange={(value) => setFilter('followUp', value)}
        activeStatus={filters.status}
        onStatusChange={(value) => setFilter('status', value)}
      />

      <LeadFilters
        filters={filters}
        onFilterChange={setFilter}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
        owners={owners}
        currentUserId={user?.id}
        summary={summary}
      />

      {active.error ? (
        <EmptyState
          icon={TriangleAlert}
          title="Couldn't load leads"
          description={
            active.error.message ?? 'Something went wrong fetching the pipeline.'
          }
          action={
            <Button size="sm" onClick={active.refresh}>
              Try again
            </Button>
          }
        />
      ) : isEmpty ? (
        // Distinct copy for "nothing matched" vs "nothing exists" — telling a
        // user with active filters that there are no leads is misleading.
        hasActiveFilters ? (
          <EmptyState
            icon={SearchX}
            title="No matching leads"
            description="No leads match the current filters. Try clearing them or broadening your search."
            action={
              <Button size="sm" variant="secondary" onClick={resetFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={UserPlus}
            title="No leads yet"
            description="When an enquiry comes in, capture the caller's name and number here and work it from there."
            action={
              canCreate && (
                <Button size="sm" onClick={() => setDialog({ type: 'capture' })}>
                  Capture the first lead
                </Button>
              )
            }
          />
        )
      ) : isBoard ? (
        <LeadBoardView
          columns={board.columns}
          isLoading={board.isLoading}
          isTruncated={board.isTruncated}
          boardLimit={board.boardLimit}
          total={board.total}
          canManage={canManage}
          canConvert={canConvert}
          on={on}
        />
      ) : (
        <>
          <LeadsTable
            leads={list.leads}
            sort={sort}
            onToggleSort={toggleSort}
            isLoading={list.isLoading}
            actions={{ canManage, canConvert, on }}
          />

          <Pagination
            currentPage={page}
            lastPage={list.lastPage}
            onPageChange={setPage}
            className="mt-4"
          />
        </>
      )}

      {/* Mounted only while open, so each open starts from a clean form. */}
      {dialog?.type === 'capture' && (
        <CaptureLeadModal onClose={closeDialog} onCreated={handleCreated} />
      )}

      {dialog?.type === 'activity' && (
        <LogActivityModal
          lead={dialog.lead}
          onClose={closeDialog}
          onLogged={(updated) => {
            closeDialog()
            applyUpdate(updated)
            toast.success('Contact logged')
          }}
        />
      )}

      {dialog?.type === 'lost' && (
        <CloseLeadModal
          lead={dialog.lead}
          onClose={closeDialog}
          onClosed={(updated) => {
            closeDialog()
            applyClosure(updated)
            toast.success('Lead closed as lost', {
              description: 'The reason is recorded and will show up in loss reporting.',
            })
          }}
        />
      )}

      {dialog?.type === 'convert' && (
        <ConvertLeadModal
          lead={dialog.lead}
          onClose={closeDialog}
          onConverted={(updated) => {
            closeDialog()
            applyClosure(updated)
            toast.success('Lead won', {
              description: `${updated.customer?.name ?? 'The customer'} is now in the directory and can be quoted.`,
            })
          }}
        />
      )}
    </>
  )
}
