import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClickOutside } from '@/hooks/useClickOutside'
import { useEscapeKey } from '@/hooks/useEscapeKey'

/**
 * The per-lead actions menu, on table rows and board cards alike.
 *
 * ── Why this exists ──
 * Logging a call is the most frequent thing anyone does in this module, and it
 * used to cost three navigations: open the row, wait for the detail page, find
 * the button. Every action here operates on a lead from wherever it is already
 * on screen.
 *
 * ── Why it is portalled ──
 * The trigger lives inside a card with `overflow-hidden` and, on the board,
 * inside a horizontally scrolling column. Either would clip an absolutely
 * positioned menu. Rendering into `document.body` at fixed coordinates means
 * the menu cannot be trapped by an ancestor's overflow — the same reasoning
 * Modal uses.
 *
 * ── Why it closes on scroll ──
 * Fixed coordinates are measured once, at open. Tracking the trigger through a
 * scroll would mean recalculating on every frame; closing is both cheaper and
 * what people expect from a menu they have just scrolled away from.
 */

/** Kept clear of the viewport edge so a flipped menu never sits flush. */
const EDGE_GAP = 8
const ESTIMATED_ITEM_HEIGHT = 36

export function LeadMenu({ label, items, className }) {
  const [anchor, setAnchor] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const isOpen = anchor !== null
  const close = useCallback(() => setAnchor(null), [])

  useClickOutside(menuRef, close, isOpen)
  useEscapeKey(close, isOpen)

  // Close on any scroll or resize — see the note above.
  useEffect(() => {
    if (!isOpen) return

    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [isOpen, close])

  // Focus the first item once the menu is on screen, so the keyboard path
  // works without a mouse ever being involved.
  useLayoutEffect(() => {
    if (!isOpen) return
    menuRef.current?.querySelector('[role="menuitem"]')?.focus()
  }, [isOpen])

  const open = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return

    const actionable = items.filter((item) => !item.separator)
    const estimatedHeight = actionable.length * ESTIMATED_ITEM_HEIGHT + 16
    // Flip above the trigger when there is not room below it. Rows near the
    // bottom of a long table are exactly where this menu gets used most.
    const flipUp =
      rect.bottom + estimatedHeight > window.innerHeight - EDGE_GAP &&
      rect.top > estimatedHeight

    setAnchor({
      top: flipUp ? rect.top - EDGE_GAP : rect.bottom + 4,
      right: Math.max(EDGE_GAP, window.innerWidth - rect.right),
      flipUp,
    })
  }

  /** Roving focus, so Up/Down walk the menu the way a menu should. */
  const handleKeyDown = (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()

    const focusable = [...menuRef.current.querySelectorAll('[role="menuitem"]')]
    const index = focusable.indexOf(document.activeElement)
    const next =
      event.key === 'ArrowDown'
        ? (index + 1) % focusable.length
        : (index - 1 + focusable.length) % focusable.length

    focusable[next]?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(event) => {
          // The row behind this is itself clickable; without this the menu
          // would open and immediately navigate away from the row it belongs to.
          event.stopPropagation()
          isOpen ? close() : open()
        }}
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-lg text-ink-subtle transition-colors',
          'hover:bg-sunken hover:text-ink',
          isOpen && 'bg-sunken text-ink',
          className,
        )}
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            onKeyDown={handleKeyDown}
            onClick={(event) => event.stopPropagation()}
            style={{
              top: anchor.top,
              right: anchor.right,
              transform: anchor.flipUp ? 'translateY(-100%)' : undefined,
            }}
            className="fixed z-50 min-w-52 animate-panel-in rounded-card bg-surface py-1.5 shadow-panel ring-1 ring-line"
          >
            {items.map((item, index) =>
              item.separator ? (
                <hr key={`sep-${index}`} className="my-1.5 border-line" />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    close()
                    item.onSelect()
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                    'disabled:pointer-events-none disabled:opacity-40',
                    item.tone === 'danger'
                      ? 'text-danger-strong hover:bg-danger-soft'
                      : 'text-ink-muted hover:bg-sunken hover:text-ink',
                  )}
                >
                  {item.icon && (
                    <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  )}
                  <span className="truncate">{item.label}</span>
                  {item.trailing && (
                    <span className="ml-auto shrink-0 text-xs text-ink-subtle">
                      {item.trailing}
                    </span>
                  )}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
