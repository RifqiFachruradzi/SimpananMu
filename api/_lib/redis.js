// Upstash Redis over its REST API (same approach as Gudang-Document): no SDK, just fetch.
// KV_REST_API_URL / KV_REST_API_TOKEN are filled in automatically when an Upstash
// database is connected to the project through the Vercel Marketplace.

const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

export class DatabaseMissingError extends Error {
  constructor() {
    super('Database Redis belum terhubung (KV_REST_API_URL / KV_REST_API_TOKEN)')
    this.code = 'db_missing'
  }
}

const post = async (path, body) => {
  if (!url() || !token()) throw new DatabaseMissingError()
  const res = await fetch(url().replace(/\/$/, '') + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (json?.error) throw new Error(`Redis: ${json.error}`)
  return json
}

/** Run one command, e.g. redis('HGET', key, field). */
export const redis = async (...cmd) => (await post('', cmd.map(String))).result

/** Run several commands in one round trip. Returns their results in order. */
export const pipeline = async (cmds) => {
  if (!cmds.length) return []
  const rows = await post('/pipeline', cmds.map((c) => c.map(String)))
  return rows.map((r) => {
    if (r.error) throw new Error(`Redis: ${r.error}`)
    return r.result
  })
}

/** HGETALL reply ([field, value, ...]) → { field: parsedJSON }. Corrupt entries are skipped. */
export const parseHash = (arr) => {
  const out = {}
  for (let i = 0; i < (arr || []).length; i += 2) {
    try {
      out[arr[i]] = JSON.parse(arr[i + 1])
    } catch {
      // skip
    }
  }
  return out
}
