import { CalendarPlus, Mail, MessageCircle, NotebookPen, Phone, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { formatDateTime, formatRelativeTime } from '@/lib/format'

/**
 * The contact history — every call, email and meeting, newest first.
 *
 * Read-only by design. There is no edit or delete, on the server or here: the
 * value of a contact log is that it is complete, and a rep who can quietly
 * remove "customer asked us to stop calling" makes the log worth less than no
 * log at all. Corrections go in as a new note.
 */

const ICONS = {
  Call: Phone,
  Email: Mail,
  Meeting: Users,
  WhatsApp: MessageCircle,
  Note: NotebookPen,
}

/**
 * @param {object} props
 * @param {Array} props.activities
 * @param {boolean} props.canManage
 * @param {() => void} props.onLog
 */
export function LeadActivityTimeline({ activities, canManage, onLog }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle as="h2" className="text-sm">
          Contact history
          {activities.length > 0 && (
            <span className="ml-1.5 text-ink-subtle">({activities.length})</span>
          )}
        </CardTitle>

        {canManage && (
          <Button size="sm" variant="secondary" onClick={onLog}>
            <CalendarPlus className="size-4" aria-hidden="true" />
            Log contact
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-ink-subtle italic">
            Nothing logged yet. Every call, email and meeting recorded here builds the
            history the next person to pick this up will rely on.
          </p>
        ) : (
          <ol className="divide-y divide-line">
            {activities.map((activity) => {
              const Icon = ICONS[activity.type] ?? NotebookPen

              return (
                <li key={activity.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-sunken text-ink-muted"
                    aria-hidden="true"
                  >
                    <Icon className="size-3.5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-medium text-ink">{activity.type}</span>
                      <span className="text-xs text-ink-subtle">
                        {/* Null once the user who logged it has been removed —
                            the activity outlives the account by design. */}
                        {activity.author?.name ?? 'A former team member'}
                      </span>
                      <time
                        dateTime={activity.occurredAt}
                        title={formatDateTime(activity.occurredAt)}
                        className="text-xs text-ink-subtle"
                      >
                        {formatRelativeTime(activity.occurredAt)}
                      </time>
                    </p>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-ink-muted">
                      {activity.notes}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
