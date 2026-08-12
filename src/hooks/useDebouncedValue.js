import { useEffect, useState } from 'react'

/**
 * Trailing-edge debounce for a changing value.
 *
 * Typing in a search box would otherwise fire one request per keystroke.
 *
 * @param {*} value
 * @param {number} [delayMs]
 */
export function useDebouncedValue(value, delayMs = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debouncedValue
}
