import { useCallback, useState } from 'react'

/**
 * State that survives a page reload.
 *
 * Reads are lazy (once, on mount) and every access is guarded — private
 * browsing modes can throw on localStorage access, and a crashed layout is a
 * much worse outcome than a forgotten preference.
 *
 * @param {string} key
 * @param {*} initialValue
 * @returns {[*, (value: *) => void]}
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item === null ? initialValue : JSON.parse(item)
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value) => {
      setStoredValue((current) => {
        const next = value instanceof Function ? value(current) : value
        try {
          window.localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // Storage unavailable or full — keep the in-memory value.
        }
        return next
      })
    },
    [key],
  )

  return [storedValue, setValue]
}
