/**
 * Renders an ApiError the way this backend reports one.
 *
 * A 422 carries `message` ("Validation failed") plus an `errors` array of
 * specifics — and for nested payloads those specifics are indexed, e.g.
 * "items[1]: quantity must be at least 1" or
 * "packages[0].features[2] must not exceed 255 characters". Showing only
 * `message` would tell the user something failed while hiding which field,
 * so the list is rendered underneath whenever the server sent one.
 *
 * @param {object} props
 * @param {Error|null} props.error An ApiError, or any Error with a `message`.
 * @param {string} [props.fallback] Used when the error carries no message.
 */
export function ApiErrorAlert({
  error,
  fallback = 'Something went wrong. Please try again.',
}) {
  if (!error) return null

  const details = Array.isArray(error.messages) ? error.messages : []

  return (
    <div
      role="alert"
      className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-strong"
    >
      <p>{error.message || fallback}</p>

      {details.length > 0 && (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
