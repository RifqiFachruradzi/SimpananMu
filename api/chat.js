import Anthropic from '@anthropic-ai/sdk'

// Serverless endpoint for the AI Buddy chat. Runs as a Vercel Function in
// production and as Vite dev middleware locally (see vite.config.js).
// Requires ANTHROPIC_API_KEY in the environment.

const MODEL = 'claude-opus-5-5'
const MAX_MESSAGES = 20
const MAX_CHARS = 4000
const MAX_CONTEXT_CHARS = 20000

const SYSTEM_PROMPT = `Kamu adalah "Buddy", asisten keuangan pribadi di aplikasi SimpananMu. Pengguna mencatat pendapatan, pengeluaran, anggaran per kategori, dan target tabungan di aplikasi ini.

Tugasmu:
- Membantu pengguna menyusun rencana menghemat pengeluaran, mengatur anggaran, mencapai target tabungan, dan memahami arus kas mereka.
- Selalu dasarkan saran pada data keuangan pengguna yang diberikan di bawah. Sebut angka nyata (dalam Rupiah, format seperti Rp 1.250.000) dan kategori spesifik dari data mereka.
- Beri langkah yang konkret dan bisa langsung dilakukan, misalnya batas anggaran yang disarankan per kategori atau nominal tabungan per bulan.
- Jika data tidak cukup untuk menjawab, katakan apa yang kurang dan sarankan pengguna mencatatnya di aplikasi.

Gaya:
- Jawab dalam Bahasa Indonesia yang ramah dan santai, kecuali pengguna memakai bahasa lain.
- Ringkas: gunakan poin-poin dan judul pendek bila membantu, hindari paragraf panjang.
- Kamu bukan penasihat keuangan berlisensi. Untuk keputusan investasi, pinjaman, pajak, atau hukum yang berisiko besar, beri gambaran umum dan sarankan berkonsultasi dengan profesional.`

const readBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') return JSON.parse(req.body)
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

const sendJSON = (res, status, payload) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

// Keeps only well-formed, alternating turns that start with the user, and
// trims to the most recent MAX_MESSAGES.
const sanitizeMessages = (messages) => {
  if (!Array.isArray(messages)) return []
  const clean = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    .slice(-MAX_MESSAGES)
  while (clean.length && clean[0].role !== 'user') clean.shift()
  const merged = []
  for (const m of clean) {
    const last = merged[merged.length - 1]
    if (last && last.role === m.role) last.content += `\n\n${m.content}`
    else merged.push({ ...m })
  }
  return merged
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJSON(res, 405, { error: 'Method not allowed' })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return sendJSON(res, 503, { error: 'AI belum dikonfigurasi (ANTHROPIC_API_KEY kosong).', code: 'not_configured' })
  }

  let body
  try {
    body = await readBody(req)
  } catch {
    return sendJSON(res, 400, { error: 'Body bukan JSON yang valid.' })
  }

  const messages = sanitizeMessages(body.messages)
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return sendJSON(res, 400, { error: 'Pesan pengguna tidak ditemukan.' })
  }
  const context = JSON.stringify(body.context ?? {}).slice(0, MAX_CONTEXT_CHARS)

  const client = new Anthropic()
  let stream
  try {
    stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      // Re-run on Anthropic's recommended model if a safety classifier declines.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        { type: 'text', text: SYSTEM_PROMPT },
        { type: 'text', text: `Data keuangan pengguna saat ini (JSON, nominal dalam Rupiah):\n${context}` },
      ],
      messages,
    })
  } catch (err) {
    console.error('chat: failed to start stream', err)
    return sendJSON(res, 502, { error: 'Gagal menghubungi AI.' })
  }

  let started = false
  const start = () => {
    if (started) return
    started = true
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Accel-Buffering', 'no')
  }

  req.on('close', () => {
    if (!res.writableEnded) stream.abort()
  })

  try {
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        start()
        res.write(event.delta.text)
      }
    }
    const final = await stream.finalMessage()
    start()
    if (final.stop_reason === 'refusal') {
      res.write('\n\nMaaf, aku tidak bisa membantu permintaan itu. Coba tanyakan hal lain seputar keuanganmu ya.')
    } else if (final.stop_reason === 'max_tokens') {
      res.write('\n\n_(Jawaban terpotong karena terlalu panjang.)_')
    }
    res.end()
  } catch (err) {
    if (stream.aborted || req.destroyed) return
    console.error('chat: stream error', err)
    if (!started) {
      const status = err instanceof Anthropic.RateLimitError ? 429 : err instanceof Anthropic.AuthenticationError ? 503 : 502
      return sendJSON(res, status, {
        error: status === 429 ? 'AI sedang sibuk, coba lagi sebentar lagi.' : 'Gagal mendapatkan jawaban dari AI.',
        code: status === 503 ? 'not_configured' : 'upstream_error',
      })
    }
    res.end('\n\n_(Koneksi ke AI terputus.)_')
  }
}
