/**
 * Product domain vocabulary.
 *
 * Keys are the API's values verbatim — `products.type` is
 * enum('Software','Service') — so a filter value goes straight onto the query
 * string and a response value looks itself up with no translation. Sending
 * anything else is a 422 naming the real types.
 */

export const PRODUCT_TYPE = {
  Software: { value: 'Software', label: 'Software', tone: 'info' },
  Service: { value: 'Service', label: 'Service', tone: 'neutral' },
}

export const PRODUCT_TYPE_OPTIONS = Object.values(PRODUCT_TYPE).map(
  ({ value, label }) => ({ value, label }),
)

/** The catalogue filter offers "All" on top of the two real types. */
export const PRODUCT_TYPE_TABS = ['All', ...Object.keys(PRODUCT_TYPE)]
