// Small helpers shared by the API functions (Vercel Node runtime and Vite dev middleware).

export const readBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}')
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

export const sendJSON = (res, status, payload) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

export const bearer = (req) => {
  const m = /^Bearer ([A-Za-z0-9_-]{20,200})$/.exec(req.headers.authorization || '')
  return m ? m[1] : null
}

// Wraps a handler so unexpected errors always come back as JSON.
export const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res)
  } catch (err) {
    console.error(`[${req.url}]`, err)
    if (res.headersSent) return res.end()
    if (err?.code === 'db_missing') return sendJSON(res, 503, { error: 'Database belum terhubung. Hubungkan Upstash Redis di Vercel (Storage).', code: 'db_missing' })
    if (err instanceof SyntaxError) return sendJSON(res, 400, { error: 'Body bukan JSON yang valid.' })
    return sendJSON(res, 500, { error: 'Terjadi kesalahan di server.' })
  }
}
