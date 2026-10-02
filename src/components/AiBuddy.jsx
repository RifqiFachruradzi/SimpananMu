import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { selectTransactions } from '../store/transactionSlice.js'
import { buildFinanceContext, localAdvice } from '../utils/advisor.js'
import Markdown from './Markdown.jsx'
import { Button, Card, PageHeader } from './ui.jsx'

const STORAGE_KEY = 'simpananmu:chat:v1'

const SUGGESTIONS = [
  'Buatkan rencana hemat pengeluaran bulan ini',
  'Kategori mana yang paling boros dan bagaimana menguranginya?',
  'Berapa yang harus aku tabung per bulan untuk mencapai target tabunganku?',
  'Analisis arus kasku 3 bulan terakhir',
  'Susun anggaran 50/30/20 dari pendapatanku',
  'Bagaimana cara membangun dana darurat?',
]

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hai! Aku **Buddy** 💖, asisten keuanganmu. Aku bisa membaca data transaksi, anggaran, dan target tabunganmu untuk membantu:\n- menyusun **rencana hemat** pengeluaran\n- mengatur **anggaran** per kategori\n- menghitung **target tabungan** per bulan\n\nMau mulai dari mana?',
}

const loadHistory = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return Array.isArray(saved) && saved.length ? saved : [WELCOME]
  } catch {
    return [WELCOME]
  }
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

// Thrown when the AI endpoint is not reachable or not configured, so the chat
// falls back to the offline advisor.
class OfflineError extends Error {}

const streamReply = async (history, context, onText, signal) => {
  let res
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })), context }),
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new OfflineError('network')
  }

  const type = res.headers.get('content-type') || ''
  if (!res.ok || type.includes('text/html')) {
    const data = type.includes('application/json') ? await res.json().catch(() => ({})) : {}
    if (res.status === 404 || res.status === 405 || data.code === 'not_configured' || type.includes('text/html')) throw new OfflineError('unavailable')
    throw new Error(data.error || `Gagal (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    onText(text)
  }
  return text
}

const AiBuddy = () => {
  const transactions = useSelector(selectTransactions)
  const planning = useSelector((state) => state.planning)
  const context = useMemo(() => buildFinanceContext(transactions, planning), [transactions, planning])

  const [messages, setMessages] = useState(loadHistory)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)
  const abortRef = useRef(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (busy) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)))
    } catch {
      // ignore storage errors
    }
  }, [messages, busy])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => () => abortRef.current?.abort(), [])

  const updateMessage = (id, patch) => setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...patch } : m)))

  const send = async (text) => {
    const content = text.trim()
    if (!content || busy) return
    const userMsg = { id: newId(), role: 'user', content }
    const replyId = newId()
    const history = [...messages.filter((m) => m.id !== 'welcome' && !m.error), userMsg]
    setMessages((list) => [...list, userMsg, { id: replyId, role: 'assistant', content: '', pending: true }])
    setInput('')
    setBusy(true)

    const controller = new AbortController()
    abortRef.current = controller
    try {
      if (offline) throw new OfflineError('cached')
      const reply = await streamReply(history, context, (partial) => updateMessage(replyId, { content: partial }), controller.signal)
      updateMessage(replyId, { content: reply || '_(Tidak ada jawaban.)_', pending: false })
    } catch (err) {
      if (err.name === 'AbortError') {
        setMessages((list) => list.map((m) => (m.id === replyId ? { ...m, pending: false, content: m.content || '_(Dihentikan.)_' } : m)))
      } else if (err instanceof OfflineError) {
        setOffline(true)
        updateMessage(replyId, { content: localAdvice(content, context), pending: false, offline: true })
      } else {
        updateMessage(replyId, { content: `⚠️ ${err.message}`, pending: false, error: true })
      }
    } finally {
      setBusy(false)
      abortRef.current = null
      inputRef.current?.focus()
    }
  }

  const reset = () => {
    abortRef.current?.abort()
    setMessages([WELCOME])
    setOffline(false)
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        icon="💖"
        title="AI Buddy"
        subtitle="Tanya rencana hemat, anggaran, target tabungan, atau apa pun soal keuanganmu. Buddy membaca data di aplikasi ini untuk memberi saran yang personal."
        actions={
          <Button variant="secondary" onClick={reset} disabled={messages.length <= 1 && !busy}>
            🧹 Percakapan baru
          </Button>
        }
      />

      <Card className="flex flex-col h-[calc(100vh-15rem)] min-h-[480px] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/70 bg-white/40">
          <div className="relative">
            <div className="h-10 w-10 rounded-full glossy-btn flex items-center justify-center text-xl">🤖</div>
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${offline ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          </div>
          <div>
            <p className="font-black text-gray-900 leading-tight">Buddy</p>
            <p className="text-xs text-gray-500">{offline ? 'Mode offline: saran otomatis dari datamu' : 'Asisten keuangan AI'}</p>
          </div>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-3xl px-4 py-3 text-[15px] ${
                  m.role === 'user'
                    ? 'glossy-btn text-white rounded-br-lg whitespace-pre-wrap'
                    : `glass-strong text-gray-800 rounded-bl-lg ${m.error ? 'ring-2 ring-rose-200' : ''}`
                }`}
              >
                {m.role === 'user' ? (
                  m.content
                ) : m.pending && !m.content ? (
                  <span className="inline-flex gap-1 py-1" aria-label="Buddy sedang mengetik">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="h-2 w-2 rounded-full bg-fuchsia-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </span>
                ) : (
                  <Markdown text={m.content} />
                )}
              </div>
            </div>
          ))}

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="chip">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex items-end gap-2 p-3 sm:p-4 border-t border-white/70 bg-white/40"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder="Tulis pertanyaanmu… (Enter untuk kirim)"
            className="flex-1 resize-none max-h-40 px-4 py-3 rounded-2xl border-2 border-white bg-white/80 focus:outline-none focus:ring-4 focus:ring-fuchsia-100 focus:border-fuchsia-300"
            aria-label="Pesan untuk Buddy"
          />
          {busy ? (
            <Button type="button" variant="secondary" onClick={() => abortRef.current?.abort()} className="!py-3">
              ⏹ Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()} className="!py-3">
              Kirim ➤
            </Button>
          )}
        </form>
      </Card>

      <p className="text-xs text-center text-gray-500">
        Buddy bisa keliru. Saran bersifat umum dan bukan nasihat keuangan profesional.
      </p>
    </div>
  )
}

export default AiBuddy
