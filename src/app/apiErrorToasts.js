import { configureApiClient } from '@/lib/apiClient'
import { toast } from '@/lib/toastStore'

/**
 * Decides which API failures deserve a toast.
 *
 * Only surfaces failures no component can meaningfully handle on its own:
 * the request never landed, or the server broke. Everything else already has
 * a better home in the UI, and a toast on top would be duplicate noise:
 *
 * - cancelled   we aborted it deliberately
 * - 401         the guard redirects to /login, which is the message
 * - 403 / 404   the page renders an empty or not-found state in context
 * - 422         forms render per-field errors from ApiError.fieldErrors
 *
 * Each toast carries a `key` so a burst of failures (every request on a
 * flaky connection) refreshes one toast instead of stacking five.
 *
 * @returns {() => void} Restore function.
 */
export function registerApiErrorToasts() {
  return configureApiClient({
    onError: (error) => {
      if (error.isCancelled) return

      if (error.isNetworkError) {
        toast.error('Cannot reach the server', {
          description: 'Check your connection and try again.',
          key: 'api-network',
        })
        return
      }

      if (error.isTimeout) {
        toast.error('The request timed out', {
          description: 'The server took too long to respond.',
          key: 'api-timeout',
        })
        return
      }

      if (error.isServerError) {
        toast.error('Something went wrong', {
          description: 'The server returned an error. Please try again.',
          key: 'api-server',
        })
      }
    },
  })
}
