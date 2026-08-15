/**
 * App-wide constants.
 *
 * Anything read from the environment is funnelled through this file so we
 * never scatter `import.meta.env` lookups across features.
 */

export const APP_NAME = 'Synnex CMS'

/**
 * The fallback matches the backend's own default PORT (3000), so a missing
 * .env still points somewhere real rather than at a port nothing listens on.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'

export const IS_DEV = import.meta.env.DEV
