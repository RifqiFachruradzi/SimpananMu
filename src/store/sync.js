import { api, ApiError, localStore } from '../utils/api.js'
import { syncStatus } from './syncSlice.js'

// Turns state-changing actions into server operations ({ col, op, id, value })
// and sends them to /api/data in order. The queue is kept in localStorage per
// account so edits made while offline are sent after a reload.

const BATCH = 400
let queue = []
let queueKey = null
let retryTimer = null
let dispatchRef = () => {}

const saveQueue = () => queueKey && localStore.set(queueKey, queue.length ? JSON.stringify(queue) : null)

const publish = (patch) => dispatchRef(syncStatus({ pending: queue.length, ...patch }))

export function startSync(dispatch, email) {
  dispatchRef = dispatch
  queueKey = `simpananmu:pending:${email}`
  try {
    queue = JSON.parse(localStore.get(queueKey) || '[]')
  } catch {
    queue = []
  }
  publish({ status: queue.length ? 'saving' : 'idle', error: '' })
  return flush()
}

export function stopSync() {
  clearTimeout(retryTimer)
  queue = []
  queueKey = null
}

/** Pending operations not yet saved (used to re-apply them over fresh server data). */
export const pendingOps = () => queue

export function enqueue(ops) {
  if (!ops.length || !queueKey) return
  queue.push(...ops)
  saveQueue()
  publish({ status: 'saving' })
  flush()
}

let current = null

/** Sends queued operations. Resolves when the queue is empty or a send failed. */
export function flush() {
  if (!current) current = run().finally(() => (current = null))
  return current
}

async function run() {
  clearTimeout(retryTimer)
  retryTimer = null
  const key = queueKey
  while (queue.length && key && key === queueKey) {
    const batch = queue.slice(0, BATCH)
    try {
      await api('data', { method: 'POST', body: { ops: batch } })
    } catch (err) {
      const permanent = err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 401 && err.status !== 429
      publish({ status: 'error', error: err.message })
      if (!permanent) {
        if (key === queueKey) retryTimer = setTimeout(flush, 8000)
        return false
      }
      // The server rejected this batch (invalid data): drop it so the rest can sync.
      queue = queue.slice(batch.length)
      saveQueue()
      continue
    }
    if (key !== queueKey) return false
    queue = queue.slice(batch.length)
    saveQueue()
    publish({ status: queue.length ? 'saving' : 'idle', error: '' })
  }
  return key === queueKey
}

if (typeof window !== 'undefined') window.addEventListener('online', () => flush())

const put = (col, value, id) => ({ col, op: 'put', ...(id !== undefined && { id }), value })
const del = (col, id) => ({ col, op: 'del', id })

/** Operations for the whole current state, replacing what the server has. */
export const replaceAllOps = (state) => [
  { col: 'tx', op: 'clear' },
  ...state.transactions.transactions.map((t) => put('tx', t)),
  { col: 'goals', op: 'clear' },
  ...state.planning.goals.map((g) => put('goals', g)),
  { col: 'budgets', op: 'clear' },
  ...Object.entries(state.planning.budgets).map(([c, limit]) => put('budgets', limit, c)),
  put('profile', { name: state.profile.name }),
]

function opsFor(action, prev, next) {
  const txById = (id) => next.transactions.transactions.find((t) => t.id === id)
  const goalById = (id) => next.planning.goals.find((g) => g.id === id)
  switch (action.type) {
    case 'transactions/addTransaction':
      return [put('tx', action.payload)]
    case 'transactions/updateTransaction':
      return txById(action.payload.id) ? [put('tx', txById(action.payload.id))] : []
    case 'transactions/deleteTransaction':
      return [del('tx', action.payload)]
    case 'transactions/importTransactions':
      return action.payload.map((t) => put('tx', t))
    case 'transactions/resetTransactions':
      return [{ col: 'tx', op: 'clear' }, ...next.transactions.transactions.map((t) => put('tx', t))]
    case 'transactions/clearTransactions':
      return [{ col: 'tx', op: 'clear' }]
    case 'planning/setBudget': {
      const { category, limit } = action.payload
      return [limit > 0 ? put('budgets', limit, category) : del('budgets', category)]
    }
    case 'planning/addGoal':
      return [put('goals', action.payload)]
    case 'planning/updateGoal':
    case 'planning/contributeToGoal':
      return goalById(action.payload.id) ? [put('goals', goalById(action.payload.id))] : []
    case 'planning/deleteGoal':
      return [del('goals', action.payload)]
    case 'profile/setName':
      return next.profile.name !== prev.profile.name ? [put('profile', { name: next.profile.name })] : []
    case 'app/importLocal':
      return replaceAllOps(next)
    default:
      return []
  }
}

export const syncMiddleware = (store) => (next) => (action) => {
  const prev = store.getState()
  const result = next(action)
  if (queueKey) enqueue(opsFor(action, prev, store.getState()))
  return result
}
