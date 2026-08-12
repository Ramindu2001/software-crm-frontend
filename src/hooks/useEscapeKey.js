import { useEffect, useRef } from 'react'

/**
 * Run `handler` when Escape is pressed, while `enabled`.
 *
 * @param {() => void} handler
 * @param {boolean} [enabled]
 */
export function useEscapeKey(handler, enabled = true) {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') handlerRef.current?.()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
