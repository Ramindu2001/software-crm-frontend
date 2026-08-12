import { useEffect } from 'react'

/**
 * Prevent the page behind an overlay from scrolling.
 *
 * Note: nesting two locks (a modal opened from the mobile drawer) works, but
 * the inner unlock restores the outer lock's value rather than reference
 * counting. Fine for our overlays; revisit if they start stacking.
 *
 * @param {boolean} isLocked
 */
export function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isLocked])
}
