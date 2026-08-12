/**
 * App-wide constants.
 *
 * Anything read from the environment is funnelled through this file so we
 * never scatter `import.meta.env` lookups across features.
 */

export const APP_NAME = 'Synnex CMS'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'

export const IS_DEV = import.meta.env.DEV
