import { ArrowRight, Ban, ExternalLink, PhoneCall, Trophy } from 'lucide-react'
import { OPEN_STAGES, isOpen } from '../constants'

/**
 * The actions available on a lead, wherever it happens to be on screen.
 *
 * Built once and shared by the table row menu and the board card menu, so the
 * two can never offer different things for the same lead — and so the board's
 * drag gesture always has a keyboard and touch equivalent sitting next to it.
 * Dragging is a mouse affordance; every move it can make is also in this list.
 *
 * Closed leads get a read-only menu. The stage moves, the contact log and both
 * closing actions are all meaningless on a lead that is already Won or Lost,
 * and the server would refuse them anyway.
 *
 * @param {object} options
 * @param {object} options.lead
 * @param {boolean} options.canManage
 * @param {boolean} options.canConvert
 * @param {object} options.on Handlers: logContact, moveStage, convert,
 *   closeLost, open.
 * @returns {Array} Items for <LeadMenu>.
 */
export function buildLeadMenuItems({ lead, canManage, canConvert, on }) {
  const items = []
  const open = isOpen(lead)

  if (open && canManage) {
    items.push({
      icon: PhoneCall,
      label: 'Log contact',
      onSelect: () => on.logContact(lead),
    })

    // Every other open stage, so the whole board is reachable without a mouse.
    const moves = OPEN_STAGES.filter((stage) => stage.value !== lead.status)
    if (moves.length) {
      items.push({ separator: true })
      for (const stage of moves) {
        items.push({
          icon: ArrowRight,
          label: `Move to ${stage.label}`,
          onSelect: () => on.moveStage(lead, stage.value),
        })
      }
    }

    items.push({ separator: true })
  }

  if (open && canConvert) {
    items.push({
      icon: Trophy,
      label: 'Mark as won',
      onSelect: () => on.convert(lead),
    })
  }

  if (open && canManage) {
    items.push({
      icon: Ban,
      label: 'Close as lost',
      tone: 'danger',
      onSelect: () => on.closeLost(lead),
    })
  }

  if (items.length) items.push({ separator: true })

  items.push({
    icon: ExternalLink,
    label: 'Open lead',
    onSelect: () => on.open(lead),
  })

  return items
}
