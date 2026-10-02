import { redis } from './redis.js'
import { bearer, sendJSON } from './http.js'

export const PREFIX = 'simpananmu'
export const USERS_KEY = `${PREFIX}:users`
export const SESSION_KEY = (token) => `${PREFIX}:session:${token}`
export const userKey = (email, col) => `${PREFIX}:u:${email}:${col}`

export const publicUser = (u) => ({ email: u.email, name: u.name })

/** Returns the signed-in user, or sends 401 and returns null. */
export async function requireUser(req, res) {
  const token = bearer(req)
  const email = token ? await redis('GET', SESSION_KEY(token)) : null
  const raw = email ? await redis('HGET', USERS_KEY, email) : null
  if (!raw) {
    sendJSON(res, 401, { error: 'Silakan masuk terlebih dahulu.', code: 'unauthorized' })
    return null
  }
  return { ...publicUser(JSON.parse(raw)), token }
}
