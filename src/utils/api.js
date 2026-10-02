// Talks to the /api functions with the session token from localStorage.

const TOKEN_KEY = 'simpananmu:token'

const storage = {
  get: (key) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set: (key, value) => {
    try {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    } catch {
      // storage blocked: the session just won't survive a reload
    }
  },
}

export const getToken = () => storage.get(TOKEN_KEY)
export const setToken = (token) => storage.set(TOKEN_KEY, token)
export const localStore = storage

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

// Fired when the server rejects the session, so the app can return to the login screen.
export const UNAUTHORIZED_EVENT = 'simpananmu:unauthorized'

/** fetch() against /api with auth header and JSON handling. Throws ApiError on failure. */
export async function api(path, { method = 'GET', body, signal, raw = false } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(`/api/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError(0, 'Tidak bisa terhubung ke server. Periksa koneksi internetmu.', 'network')
  }

  if (raw && res.ok) return res
  const type = res.headers.get('content-type') || ''
  const data = type.includes('application/json') ? await res.json().catch(() => ({})) : {}
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    throw new ApiError(res.status, data.error || `Permintaan gagal (${res.status}).`, data.code || (type.includes('text/html') ? 'unavailable' : undefined))
  }
  return data
}
