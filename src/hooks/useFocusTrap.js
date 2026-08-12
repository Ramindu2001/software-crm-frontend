import { useEffect } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Elements are re-queried on every Tab rather than cached, so the trap keeps
 * working when the contents change while open (a form revealing a field, a
 * button becoming enabled).
 */
function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    // getClientRects() is a more reliable visibility test than offsetParent,
    // which misreports for position: fixed subtrees like our modal.
    (el) => el.getClientRects().length > 0,
  )
}

/**
 * Confine keyboard focus to `ref` while `isActive`.
 *
 * Moves focus into the container on activate and restores it to whatever was
 * focused before on deactivate. The container must be focusable — give it
 * `tabIndex={-1}` — so focus has somewhere to land before the user Tabs.
 *
 * @param {React.RefObject<HTMLElement>} ref
 * @param {boolean} isActive
 */
export function useFocusTrap(ref, isActive) {
  useEffect(() => {
    const container = ref.current
    if (!isActive || !container) return

    const previouslyFocused = document.activeElement

    // Focus the container itself rather than its first control: screen readers
    // then announce the dialog and its accessible name before its contents.
    container.focus()

    const onKeyDown = (event) => {
      if (event.key !== 'Tab') return

      const items = getFocusableElements(container)
      if (items.length === 0) {
        // Nothing to Tab to — keep focus pinned rather than letting it escape.
        event.preventDefault()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      // -1 covers the container itself, which is deliberately not in the list.
      const currentIndex = items.indexOf(document.activeElement)

      if (event.shiftKey) {
        if (currentIndex <= 0) {
          event.preventDefault()
          last.focus()
        }
      } else if (currentIndex === -1 || currentIndex === items.length - 1) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Only restore if the element is still in the document — it may have
      // been unmounted while the trap was open.
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [ref, isActive])
}
