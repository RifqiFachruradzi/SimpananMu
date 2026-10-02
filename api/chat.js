import { ApiError, FinishReason, GoogleGenAI } from '@google/genai'
import { PREFIX, requireUser } from './_lib/auth.js'
import { handle, readBody, sendJSON } from './_lib/http.js'
import { redis } from './_lib/redis.js'

// Serverless endpoint for the AI Buddy chat. Runs as a Vercel Function in
// production and as Vite dev middleware locally (see vite.config.js).
// Requires GEMINI_API_KEY in the environment (free key: aistudio.google.com).
// Signed-in users only, with a daily question limit per account (BUDDY_DAILY_LIMIT, default 30).

// Tried in order. The free tier often answers 503 (overloaded) or 429 (per-model
// quota), and a model name can be unavailable for a key (404), so fall back to
// the next model before giving up. GEMINI_MODEL, if set, is tried first.
const MODELS = [...new Set([process.env.GEMINI_MODEL, 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'].filter(Boolean))]
const RETRY_NEXT_MODEL = new Set([404, 429, 500, 503])
const MAX_MESSAGES = 20
const MAX_CHARS = 4000
const MAX_CONTEXT_CHARS = 20000
const DAILY_LIMIT = Number(process.env.BUDDY_DAILY_LIMIT) || 30

const SYSTEM_PROMPT = `Kamu adalah "Buddy", asisten keuangan pribadi di aplikasi SimpananMu. Pengguna mencatat pendapatan, pengeluaran, anggaran per kategori, dan target tabungan di aplikasi ini.

Tugasmu:
- Membantu pengguna menyusun rencana menghemat pengeluaran, mengatur anggaran, mencapai target tabungan, dan memahami arus kas mereka.
- Selalu dasarkan saran pada data keuangan pengguna yang diberikan di bawah. Sebut angka nyata (dalam Rupiah, format seperti Rp 1.250.000) dan kategori spesifik dari data mereka.
- Beri langkah yang konkret dan bisa langsung dilakukan, misalnya batas anggaran yang disarankan per kategori atau nominal tabungan per bulan.
- Jika data tidak cukup untuk menjawab, katakan apa yang kurang dan sarankan pengguna mencatatnya di aplikasi.

Gaya:
- Jawab dalam Bahasa Indonesia yang ramah dan santai, kecuali pengguna memakai bahasa lain.
- Ringkas: gunakan poin-poin dan judul pendek bila membantu, hindari paragraf panjang.
- Jangan gunakan emoji.
- Kamu bukan penasihat keuangan berlisensi. Untuk keputusan investasi, pinjaman, pajak, atau hukum yang berisiko besar, beri gambaran umum dan sarankan berkonsultasi dengan profesional.`

// Short, user-safe description of an upstream error, e.g. "503 UNAVAILABLE: The model is overloaded".
const describeError = (err) => {
  if (!(err instanceof ApiError)) return err?.name === 'TimeoutError' ? 'timeout' : String(err?.message || err).slice(0, 160)
  try {
    const { error } = JSON.parse(err.message)
    return `${err.status} ${error?.status || ''}: ${error?.message || ''}`.slice(0, 200)
  } catch {
    return `${err.status}: ${err.message}`.slice(0, 200)
  }
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

export default handle(async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJSON(res, 405, { error: 'Method not allowed' })
  }
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return sendJSON(res, 503, { error: 'AI belum dikonfigurasi (GEMINI_API_KEY kosong).', code: 'not_configured' })
  }

  const me = await requireUser(req, res)
  if (!me) return

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

  // Daily limit per account (resets at midnight UTC) keeps the shared Gemini quota fair.
  const usageKey = `${PREFIX}:buddy:${me.email}:${new Date().toISOString().slice(0, 10)}`
  const used = await redis('INCR', usageKey)
  if (used === 1) await redis('EXPIRE', usageKey, 60 * 60 * 48)
  if (used > DAILY_LIMIT) {
    return sendJSON(res, 429, { error: `Batas harian Buddy (${DAILY_LIMIT} pertanyaan) sudah tercapai. Coba lagi besok ya.`, code: 'daily_limit' })
  }

  // Stop generating if the browser disconnects. (Listen on res: req's 'close'
  // fires as soon as the request body has been read.)
  const controller = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) controller.abort()
  })

  const ai = new GoogleGenAI({ apiKey })
  let started = false
  const start = () => {
    if (started) return
    started = true
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Accel-Buffering', 'no')
  }

  const request = (model) =>
    ai.models.generateContentStream({
      model,
      // Gemini uses "model" for the assistant role.
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      config: {
        systemInstruction: `${SYSTEM_PROMPT}\n\nData keuangan pengguna saat ini (JSON, nominal dalam Rupiah):\n${context}`,
        maxOutputTokens: 8192,
        abortSignal: controller.signal,
      },
    })

  try {
    let stream
    for (const [i, model] of MODELS.entries()) {
      try {
        stream = await request(model)
        break
      } catch (err) {
        const last = i === MODELS.length - 1
        if (last || !(err instanceof ApiError) || !RETRY_NEXT_MODEL.has(err.status)) throw err
        console.warn(`chat: ${model} failed (${describeError(err)}), trying ${MODELS[i + 1]}`)
      }
    }

    let finishReason
    let blocked = false
    let wrote = false
    for await (const chunk of stream) {
      if (chunk.promptFeedback?.blockReason) blocked = true
      finishReason = chunk.candidates?.[0]?.finishReason ?? finishReason
      const text = chunk.text
      if (text) {
        start()
        res.write(text)
        wrote = true
      }
    }
    start()
    const stoppedEarly = finishReason && finishReason !== FinishReason.STOP
    if (blocked || (!wrote && stoppedEarly)) {
      res.write('Maaf, aku tidak bisa membantu permintaan itu. Coba tanyakan hal lain seputar keuanganmu ya.')
    } else if (finishReason === FinishReason.MAX_TOKENS) {
      res.write('\n\n_(Jawaban terpotong karena terlalu panjang.)_')
    } else if (stoppedEarly) {
      res.write('\n\n_(Jawaban dihentikan oleh filter keamanan.)_')
    }
    res.end()
  } catch (err) {
    if (controller.signal.aborted) return
    console.error('chat: gemini error', err)
    if (!started) {
      const status = err instanceof ApiError ? err.status : 502
      const detail = describeError(err)
      if (status === 429) {
        return sendJSON(res, 429, { error: 'Kuota gratis Gemini sedang habis atau terlalu banyak permintaan. Coba lagi sebentar lagi.', detail, code: 'rate_limited' })
      }
      if (status === 401 || status === 403 || (status === 400 && /api key|API_KEY/i.test(detail))) {
        return sendJSON(res, 503, { error: 'API key Gemini tidak valid atau tidak punya akses. Periksa GEMINI_API_KEY di Vercel.', detail, code: 'bad_key' })
      }
      if (status === 503 || status === 500) {
        return sendJSON(res, 503, { error: 'Server Gemini sedang sibuk. Coba lagi beberapa saat lagi.', detail, code: 'upstream_busy' })
      }
      return sendJSON(res, 502, { error: 'Gagal mendapatkan jawaban dari AI.', detail, code: 'upstream_error' })
    }
    res.end('\n\n_(Koneksi ke AI terputus.)_')
  }
})
