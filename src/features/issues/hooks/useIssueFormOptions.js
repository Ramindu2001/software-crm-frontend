import { useEffect, useState } from 'react'
import { listAssignees, listCustomers } from '../api'

/**
 * Loads the assignee and customer lookups for the create form.
 *
 * Fetched through the api/ selector rather than imported from the mock module,
 * so switching VITE_ISSUES_API=http swaps these for real endpoints without the
 * form knowing.
 */
export function useIssueFormOptions() {
  const [options, setOptions] = useState({ assignees: [], customers: [] })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    Promise.all([listAssignees(), listCustomers()])
      .then(([assignees, customers]) => {
        if (ignore) return
        setOptions({ assignees, customers })
        setIsLoading(false)
      })
      .catch(() => {
        // Lookups failing shouldn't block the form — the user can still type a
        // title and submit; those two fields simply offer no choices.
        if (!ignore) setIsLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [])

  return { ...options, isLoading }
}
