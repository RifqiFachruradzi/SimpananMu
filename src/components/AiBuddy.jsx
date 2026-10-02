import { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { RotateCcw, SendHorizontal, Sparkles, Square } from 'lucide-react'
import { selectTransactions } from '../store/transactionSlice.js'
import { buildFinanceContext, localAdvice } from '../utils/advisor.js'
import { getToken, localStore, UNAUTHORIZED_EVENT } from '../utils/api.js'
import { useSession } from '../utils/session.js'
import Markdown from './Markdown.jsx'
import { Card, IconButton } from './ui.jsx'

// Chat history is kept per account on this device.
const historyKey = (email) => `simpananmu:chat:v2:${email}`

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
    'Hai! Aku **Buddy**, asisten keuanganmu. Aku bisa membaca data transaksi, anggaran, dan target tabunganmu untuk membantu:\n- menyusun **rencana hemat** pengeluaran\n- mengatur **anggaran** per kategori\n- menghitung **target tabungan** per bulan\n\nMau mulai dari mana?',
}

const loadHistory = (key) => {
  try {
    const saved = JSON.parse(localStore.get(key) || 'null')
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
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
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
    if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    if (res.status === 404 || res.status === 405 || data.code === 'not_configured' || type.includes('text/html')) throw new OfflineError('unavailable')
    const message = data.error || `Gagal (${res.status})`
    throw new Error(data.detail ? `${message}\n\nDetail: \`${data.detail.replace(/`/g, "'")}\`` : message)
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

  const { user } = useSession()
  const storageKey = historyKey(user.email)
  const [messages, setMessages] = useState(() => loadHistory(storageKey))
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)
  const abortRef = useRef(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (busy) return
    localStore.set(storageKey, JSON.stringify(messages.slice(-50)))
  }, [messages, busy, storageKey])

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
        updateMessage(replyId, { content: err.message, pending: false, error: true })
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
    <div className="max-w-4xl mx-auto px-5 md:px-8 pt-4 md:pt-6 space-y-6">
      <Card className="flex flex-col h-[calc(100dvh-12.5rem)] lg:h-[calc(100dvh-8rem)] min-h-[420px] overflow-hidden !bg-white">
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-primary-container/10">
          <div className="relative">
            <div className="icon-disc w-11 h-11 bg-gradient-to-tr from-primary-container to-secondary-container text-white shadow-bead">
              <Sparkles size={22} />
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${offline ? 'bg-secondary-container' : 'bg-mint'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-headline-sm font-extrabold text-on-surface leading-tight">AI Buddy</h1>
            <p className="text-label-sm text-on-surface-variant truncate">{offline ? 'Mode offline · saran otomatis dari datamu' : 'Asisten keuangan pribadimu'}</p>
          </div>
          <IconButton label="Percakapan baru" onClick={reset} disabled={messages.length <= 1 && !busy} className="disabled:opacity-40">
            <RotateCcw size={18} />
          </IconButton>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-card px-4 py-3 text-body-md ${
                  m.role === 'user'
                    ? 'glossy-btn text-white rounded-br-lg whitespace-pre-wrap'
                    : `glass-strong text-on-surface rounded-bl-lg ${m.error ? 'ring-2 ring-raspberry/30' : ''}`
                }`}
              >
                {m.role === 'user' ? (
                  m.content
                ) : m.pending && !m.content ? (
                  <span className="inline-flex gap-1 py-1" aria-label="Buddy sedang mengetik">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="h-2 w-2 rounded-full bg-primary-container animate-bounce" style={{ animationDelay: `${d}ms` }} />
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
          className="flex items-end gap-2 p-3 sm:p-4 border-t border-primary-container/10"
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
            placeholder="Tanya Buddy…"
            className="flex-1 resize-none max-h-40 px-5 py-3 rounded-[1.5rem] border border-outline-variant/60 bg-surface-container-low text-body-lg placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-[3px] focus:ring-primary-container/20 focus:border-primary-container"
            aria-label="Pesan untuk Buddy"
          />
          {busy ? (
            <IconButton label="Hentikan" type="button" onClick={() => abortRef.current?.abort()} className="!w-12 !h-12">
              <Square size={18} fill="currentColor" />
            </IconButton>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Kirim"
              className="icon-disc w-12 h-12 glossy-btn transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              <SendHorizontal size={20} />
            </button>
          )}
        </form>
        <p className="px-4 pb-2 -mt-1 text-[10px] text-center text-on-surface-variant">
          Buddy bisa keliru. Saran bersifat umum, bukan nasihat keuangan profesional.
        </p>
      </Card>
    </div>
  )
}

export default AiBuddy
