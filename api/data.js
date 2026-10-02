import { requireUser, userKey, USERS_KEY } from './_lib/auth.js'
import { handle, readBody, sendJSON } from './_lib/http.js'
import { parseHash, pipeline, redis } from './_lib/redis.js'

// Per-user finance data. Each item is its own hash field, so edits from two devices
// only collide when they touch the same transaction, budget or goal.
//   GET  → { user, data: { transactions, budgets, goals, profile } }
//   POST { ops: [{ col, op: 'put' | 'del' | 'clear', id?, value? }] }

const MAX_OPS = 500
const MAX_TRANSACTIONS = 20000
const MAX_GOALS = 100
const MAX_AMOUNT = 1e13
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const text = (v, max) => String(v ?? '').trim().slice(0, max)
const money = (v, min = 0) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= min && n <= MAX_AMOUNT ? n : null
}

const cleanTransaction = (v) => {
  if (!v || !ID_RE.test(v.id) || !DATE_RE.test(v.date) || !['income', 'expense'].includes(v.type)) return null
  const amount = money(v.amount)
  const description = text(v.description, 120)
  if (!amount || !description) return null
  return { id: v.id, date: v.date, type: v.type, amount, description, category: text(v.category, 40) || 'Lainnya', note: text(v.note, 300) }
}

const cleanGoal = (v) => {
  if (!v || !ID_RE.test(v.id)) return null
  const name = text(v.name, 60)
  const target = money(v.target)
  const saved = money(v.saved)
  const deadline = DATE_RE.test(v.deadline || '') ? v.deadline : ''
  if (!name || !target || saved === null) return null
  return { id: v.id, name, target, saved, deadline }
}

// Turns one client op into Redis commands, or returns an error string.
function toCommands(email, op) {
  const key = userKey(email, op.col)
  if (op.col === 'tx' || op.col === 'goals') {
    if (op.op === 'clear') return [['DEL', key]]
    if (op.op === 'del') return ID_RE.test(op.id || '') ? [['HDEL', key, op.id]] : 'id tidak valid'
    if (op.op === 'put') {
      const v = op.col === 'tx' ? cleanTransaction(op.value) : cleanGoal(op.value)
      return v ? [['HSET', key, v.id, JSON.stringify(v)]] : 'data tidak valid'
    }
  }
  if (op.col === 'budgets') {
    if (op.op === 'clear') return [['DEL', key]]
    const category = text(op.id, 40)
    if (!category) return 'kategori tidak valid'
    if (op.op === 'del') return [['HDEL', key, category]]
    if (op.op === 'put') {
      const limit = money(op.value, 1)
      return limit ? [['HSET', key, category, JSON.stringify(limit)]] : 'batas tidak valid'
    }
  }
  if (op.col === 'profile' && op.op === 'put') {
    return [['SET', key, JSON.stringify({ name: text(op.value?.name, 30) })]]
  }
  return 'operasi tidak dikenal'
}

export default handle(async (req, res) => {
  const me = await requireUser(req, res)
  if (!me) return

  if (req.method === 'GET') {
    const [tx, budgets, goals, profile] = await pipeline([
      ['HGETALL', userKey(me.email, 'tx')],
      ['HGETALL', userKey(me.email, 'budgets')],
      ['HGETALL', userKey(me.email, 'goals')],
      ['GET', userKey(me.email, 'profile')],
    ])
    return sendJSON(res, 200, {
      user: { email: me.email, name: me.name },
      data: {
        transactions: Object.values(parseHash(tx)),
        budgets: parseHash(budgets),
        goals: Object.values(parseHash(goals)),
        profile: profile ? JSON.parse(profile) : { name: me.name },
      },
    })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return sendJSON(res, 405, { error: 'Method not allowed' })
  }

  const { ops } = await readBody(req)
  if (!Array.isArray(ops) || !ops.length || ops.length > MAX_OPS) return sendJSON(res, 400, { error: `Kirim 1–${MAX_OPS} operasi.` })

  const commands = []
  for (const [i, op] of ops.entries()) {
    const result = toCommands(me.email, op || {})
    if (typeof result === 'string') return sendJSON(res, 400, { error: `Operasi #${i + 1}: ${result}.` })
    commands.push(...result)
  }

  // Simple size caps so one account can't fill the database.
  const adds = (col) => ops.filter((o) => o.col === col && o.op === 'put').length
  if (adds('tx') || adds('goals')) {
    const [txCount, goalCount] = await pipeline([
      ['HLEN', userKey(me.email, 'tx')],
      ['HLEN', userKey(me.email, 'goals')],
    ])
    const clears = (col) => ops.some((o) => o.col === col && o.op === 'clear')
    if ((clears('tx') ? 0 : txCount) + adds('tx') > MAX_TRANSACTIONS) return sendJSON(res, 413, { error: `Maksimal ${MAX_TRANSACTIONS} transaksi per akun.` })
    if ((clears('goals') ? 0 : goalCount) + adds('goals') > MAX_GOALS) return sendJSON(res, 413, { error: `Maksimal ${MAX_GOALS} target tabungan per akun.` })
  }

  // Upstash runs a pipeline in order, so a "clear" followed by "put"s replaces a collection.
  await pipeline(commands)
  if (ops.some((o) => o.col === 'profile')) {
    const name = text(ops.findLast((o) => o.col === 'profile').value?.name, 30)
    if (name) {
      const raw = await redis('HGET', USERS_KEY, me.email)
      if (raw) await redis('HSET', USERS_KEY, me.email, JSON.stringify({ ...JSON.parse(raw), name }))
    }
  }
  return sendJSON(res, 200, { ok: true })
})
