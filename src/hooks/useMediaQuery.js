import { useCallback, useSyncExternalStore } from 'react'

/**
 * Track a CSS media query from React.
 *
 * Uses useSyncExternalStore rather than useState + useEffect: matchMedia is an
 * external store, and subscribing this way avoids a render pass where the
 * value is wrong (and the setState-in-effect cascade that comes with it).
 *
 * @param {string} query e.g. '(min-width: 1024px)'
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onStoreChange) => {
      const mediaQueryList = window.matchMedia(query)
      mediaQueryList.addEventListener('change', onStoreChange)
      return () => mediaQueryList.removeEventListener('change', onStoreChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot)
}
