import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { PREFIX, publicUser, requireUser, SESSION_KEY, USERS_KEY } from './_lib/auth.js'
import { bearer, handle, readBody, sendJSON } from './_lib/http.js'
import { redis } from './_lib/redis.js'

// Accounts: email + password (scrypt hash), sessions are random bearer tokens kept in Redis.

const scryptAsync = promisify(scrypt)
const SESSION_TTL = 60 * 60 * 24 * 30 // 30 days
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/
const validPassword = (p) => p.length >= 8 && p.length <= 200

const hashPassword = async (password, salt) => (await scryptAsync(password, salt, 64)).toString('hex')

async function matches(password, user) {
  if (!user?.salt || !user?.hash) return false
  const a = Buffer.from(await hashPassword(password, user.salt), 'hex')
  const b = Buffer.from(user.hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

const getUser = async (email) => {
  const raw = await redis('HGET', USERS_KEY, email)
  return raw ? JSON.parse(raw) : null
}

// At most 10 login/register/password attempts per email per 15 minutes.
async function tooManyAttempts(email) {
  const key = `${PREFIX}:attempts:${email}`
  const n = await redis('INCR', key)
  if (n === 1) await redis('EXPIRE', key, 900)
  return n > 10
}

async function startSession(res, user) {
  const token = randomBytes(32).toString('base64url')
  await redis('SET', SESSION_KEY(token), user.email, 'EX', SESSION_TTL)
  sendJSON(res, 200, { token, user: publicUser(user) })
}

export default handle(async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJSON(res, 405, { error: 'Method not allowed' })
  }
  const body = await readBody(req)
  const action = body.action

  if (action === 'login' || action === 'register') {
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    if (!EMAIL_RE.test(email)) return sendJSON(res, 400, { error: 'Format email tidak valid.' })
    if (!validPassword(password)) return sendJSON(res, 400, { error: 'Kata sandi minimal 8 karakter.' })
    if (await tooManyAttempts(email)) return sendJSON(res, 429, { error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' })

    if (action === 'login') {
      const user = await getUser(email)
      if (!user || !(await matches(password, user))) return sendJSON(res, 401, { error: 'Email atau kata sandi salah.' })
      await redis('DEL', `${PREFIX}:attempts:${email}`)
      return startSession(res, user)
    }

    const name = String(body.name || '').trim().slice(0, 30)
    if (!name) return sendJSON(res, 400, { error: 'Nama wajib diisi.' })
    const salt = randomBytes(16).toString('hex')
    const user = { email, name, salt, hash: await hashPassword(password, salt), created: new Date().toISOString() }
    // HSETNX makes registration atomic: two sign-ups for the same email can't both win.
    if (!(await redis('HSETNX', USERS_KEY, email, JSON.stringify(user)))) {
      return sendJSON(res, 409, { error: 'Email sudah terdaftar. Silakan masuk.' })
    }
    await redis('SET', `${PREFIX}:u:${email}:profile`, JSON.stringify({ name }))
    return startSession(res, user)
  }

  if (action === 'logout') {
    const token = bearer(req)
    if (token) await redis('DEL', SESSION_KEY(token))
    return sendJSON(res, 200, { ok: true })
  }

  const me = await requireUser(req, res)
  if (!me) return

  if (action === 'me') return sendJSON(res, 200, { user: publicUser(me) })

  if (action === 'password') {
    const oldPw = String(body.old || '')
    const newPw = String(body.new || '')
    if (!validPassword(newPw)) return sendJSON(res, 400, { error: 'Kata sandi baru minimal 8 karakter.' })
    if (await tooManyAttempts(me.email)) return sendJSON(res, 429, { error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' })
    const user = await getUser(me.email)
    if (!user || !(await matches(oldPw, user))) return sendJSON(res, 401, { error: 'Kata sandi lama salah.' })
    user.salt = randomBytes(16).toString('hex')
    user.hash = await hashPassword(newPw, user.salt)
    await redis('HSET', USERS_KEY, me.email, JSON.stringify(user))
    await redis('DEL', `${PREFIX}:attempts:${me.email}`)
    return sendJSON(res, 200, { ok: true })
  }

  return sendJSON(res, 400, { error: 'Aksi tidak dikenal.' })
})
