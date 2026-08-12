import { API_BASE_URL } from '@/config/constants'

/**
 * HTTP client for the Laravel backend.
 *
 * Built on fetch rather than Axios: our wrapper already *is* the interceptor
 * layer, so a dependency whose main draw is its interceptor API earns little
 * here. AbortController covers timeouts and cancellation natively.
 *
 * The client never imports the auth feature — lib/ is the bottom of the
 * dependency chain, so reaching up into features/ would invert it. Instead the
 * token getter and 401 handler are registered from above via
 * configureApiClient(). That also means this module can be tested with no
 * React and no auth in scope.
 */

const DEFAULT_TIMEOUT_MS = 15000

const DEFAULT_CONFIG = {
  baseUrl: API_BASE_URL,
  /** Request interceptor: returns the bearer token, or null when signed out. */
  getToken: () => null,
  /** Response interceptor: called once when the server rejects our token. */
  onUnauthorized: null,
  /** Optional escape hatch to mutate the request before it is sent. */
  onRequest: null,
  /** Optional observer for every response, before status handling. */
  onResponse: null,
  /**
   * Called with every ApiError just before it is thrown. Intentionally
   * policy-free: the client reports, the handler decides what deserves to be
   * surfaced.
   */
  onError: null,
  timeoutMs: DEFAULT_TIMEOUT_MS,
}

let config = { ...DEFAULT_CONFIG }

/**
 * Register interceptors. Returns a restore function, so callers can clean up
 * (e.g. from a useEffect) without leaving stale handlers behind.
 *
 * The restore only reverts the keys this call set, rather than snapshotting
 * the whole config. With more than one registration (auth's token handler and
 * the error reporter), a wholesale snapshot would let StrictMode's
 * mount/cleanup/mount cycle restore a stale object and silently drop the other
 * caller's interceptor.
 *
 * @param {Partial<typeof DEFAULT_CONFIG>} overrides
 * @returns {() => void}
 */
export function configureApiClient(overrides) {
  const previousValues = {}
  for (const key of Object.keys(overrides)) {
    previousValues[key] = config[key]
  }

  config = { ...config, ...overrides }

  return () => {
    config = { ...config, ...previousValues }
  }
}

/** Test seam — resets everything back to defaults. */
export function resetApiClient() {
  config = { ...DEFAULT_CONFIG }
}

export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{status?: number, code?: string, data?: *, url?: string,
   *   fieldErrors?: Record<string, string[]>}} details
   */
  constructor(message, { status = 0, code, data, url, fieldErrors } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
    this.url = url
    /** Laravel 422 payloads expose per-field messages; forms consume these. */
    this.fieldErrors = fieldErrors
  }

  get isNetworkError() {
    return this.status === 0 && this.code === 'network'
  }

  get isTimeout() {
    return this.code === 'timeout'
  }

  get isCancelled() {
    return this.code === 'cancelled'
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }

  get isNotFound() {
    return this.status === 404
  }

  get isValidationError() {
    return this.status === 422
  }

  get isServerError() {
    return this.status >= 500
  }
}

/** Drops empty values so we don't send `?status=` for "no filter". */
function toQueryString(params) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue

    if (Array.isArray(value)) {
      // Laravel reads repeated `key[]` params as an array.
      for (const item of value) {
        if (item !== undefined && item !== null && item !== '') {
          search.append(`${key}[]`, String(item))
        }
      }
      continue
    }

    search.append(key, String(value))
  }

  return search.toString()
}

function buildUrl(path, params) {
  // String joining rather than `new URL`, which silently drops a base path
  // segment when the path begins with a slash.
  const base = config.baseUrl.replace(/\/+$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  const query = params ? toQueryString(params) : ''

  return query ? `${base}${suffix}?${query}` : `${base}${suffix}`
}

async function parseBody(response) {
  if (response.status === 204 || response.status === 205) return null

  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('json')) {
    try {
      return await response.json()
    } catch {
      // A malformed body shouldn't mask the status code.
      return null
    }
  }

  const text = await response.text()
  return text || null
}

/** Reports an error to the registered handler, then hands it back to throw. */
function reportError(error) {
  config.onError?.(error)
  return error
}

function extractMessage(data, response) {
  // Laravel's convention: { message, errors? }
  if (data && typeof data === 'object' && typeof data.message === 'string') {
    return data.message
  }
  if (typeof data === 'string' && data.trim()) return data

  return `Request failed with status ${response.status}.`
}

/**
 * Perform a request.
 *
 * @param {string} path Path relative to the API base, e.g. '/issues'.
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {*} [options.body] Serialised as JSON unless it's FormData.
 * @param {Record<string, *>} [options.params] Query string values.
 * @param {Record<string, string>} [options.headers]
 * @param {AbortSignal} [options.signal] Caller cancellation.
 * @param {boolean} [options.auth] Attach the bearer token. Default true.
 * @param {boolean} [options.handleUnauthorized] Fire the global 401 handler.
 *   Default true — pass false for the login endpoint, where a 401 means
 *   "wrong password", not "your session died".
 * @param {number} [options.timeoutMs]
 * @returns {Promise<*>} The parsed response body.
 * @throws {ApiError}
 */
export async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    params,
    headers = {},
    signal,
    auth = true,
    handleUnauthorized = true,
    timeoutMs = config.timeoutMs,
  } = options

  const url = buildUrl(path, params)

  const controller = new AbortController()
  let didTimeout = false
  const timeoutId = setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, timeoutMs)

  // Bridge the caller's signal into ours so either can cancel.
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  const requestHeaders = { Accept: 'application/json', ...headers }

  let payload
  if (body instanceof FormData) {
    // Let the browser set the multipart boundary; setting Content-Type here
    // would produce a header with no boundary and the upload would fail.
    payload = body
  } else if (body !== undefined) {
    payload = JSON.stringify(body)
    requestHeaders['Content-Type'] = 'application/json'
  }

  // --- Request interceptor -------------------------------------------------
  if (auth) {
    const token = config.getToken?.()
    if (token) requestHeaders.Authorization = `Bearer ${token}`
  }

  let init = {
    method,
    headers: requestHeaders,
    body: payload,
    signal: controller.signal,
    credentials: 'same-origin',
  }

  if (config.onRequest) {
    init = config.onRequest(init, { url, path, method }) ?? init
  }

  // Already cancelled before we got here — skip the round trip entirely.
  if (controller.signal.aborted) {
    clearTimeout(timeoutId)
    throw reportError(
      new ApiError('The request was cancelled.', { code: 'cancelled', url }),
    )
  }

  let response
  try {
    response = await fetch(url, init)
  } catch (error) {
    if (controller.signal.aborted) {
      throw reportError(
        didTimeout
          ? new ApiError('The request timed out.', { code: 'timeout', url })
          : new ApiError('The request was cancelled.', { code: 'cancelled', url }),
      )
    }
    throw reportError(
      new ApiError(
        'Could not reach the server. Check your connection and try again.',
        { code: 'network', url, data: error?.message },
      ),
    )
  } finally {
    clearTimeout(timeoutId)
  }

  // --- Response interceptor ------------------------------------------------
  config.onResponse?.(response, { url, path, method })

  const data = await parseBody(response)

  if (!response.ok) {
    // A rejected token invalidates the whole session, so this is handled
    // centrally rather than at every call site.
    if (response.status === 401 && handleUnauthorized) {
      config.onUnauthorized?.()
    }

    throw reportError(
      new ApiError(extractMessage(data, response), {
        status: response.status,
        data,
        url,
        fieldErrors:
          data && typeof data === 'object' ? data.errors : undefined,
      }),
    )
  }

  return data
}

/** Thin verb helpers. `body` comes second for the methods that take one. */
export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) =>
    request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}
