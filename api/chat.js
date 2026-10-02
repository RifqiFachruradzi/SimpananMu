import { ApiError, FinishReason, GoogleGenAI } from '@google/genai'

// Serverless endpoint for the AI Buddy chat. Runs as a Vercel Function in
// production and as Vite dev middleware locally (see vite.config.js).
// Requires GEMINI_API_KEY in the environment (free key: aistudio.google.com).

// Alias that follows Google's current Flash model; override with GEMINI_MODEL.
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest'
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
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return sendJSON(res, 503, { error: 'AI belum dikonfigurasi (GEMINI_API_KEY kosong).', code: 'not_configured' })
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

  try {
    const stream = await ai.models.generateContentStream({
      model: MODEL,
      // Gemini uses "model" for the assistant role.
      contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      config: {
        systemInstruction: `${SYSTEM_PROMPT}\n\nData keuangan pengguna saat ini (JSON, nominal dalam Rupiah):\n${context}`,
        maxOutputTokens: 8192,
        abortSignal: controller.signal,
      },
    })

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
      const notConfigured = status === 400 || status === 401 || status === 403
      return sendJSON(res, status === 429 ? 429 : notConfigured ? 503 : 502, {
        error: status === 429 ? 'Kuota gratis Gemini sedang habis atau terlalu banyak permintaan. Coba lagi sebentar lagi.' : 'Gagal mendapatkan jawaban dari AI.',
        code: notConfigured ? 'not_configured' : 'upstream_error',
      })
    }
    res.end('\n\n_(Koneksi ke AI terputus.)_')
  }
}
