import { useEffect, useRef } from 'react'

/**
 * Call `handler` when a pointer event lands outside `ref`.
 *
 * The handler is kept in a ref so callers don't have to memoise it — otherwise
 * every parent render would tear down and re-attach the listeners.
 *
 * @param {React.RefObject<HTMLElement>} ref
 * @param {(event: Event) => void} handler
 * @param {boolean} [enabled] Skip listening when the menu is closed.
 */
export function useClickOutside(ref, handler, enabled = true) {
  const handlerRef = useRef(handler)

  // Assigned in an effect, not during render — refs must not be mutated while
  // rendering. Listeners only fire from user events, which are always after
  // commit, so the handler is never stale by the time it is called.
  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    if (!enabled) return

    const listener = (event) => {
      const el = ref.current
      if (!el || el.contains(event.target)) return
      handlerRef.current(event)
    }

    // `mousedown`/`touchstart` rather than `click`: closing on press feels
    // immediate, and it fires before a click handler inside the menu can
    // re-render the tree out from under us.
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, enabled])
}
