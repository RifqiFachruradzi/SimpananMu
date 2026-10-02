import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Bell, CloudOff, FileText, Flower2, HeartHandshake, Loader2, LogOut, PiggyBank, ReceiptText, Target } from 'lucide-react'
import { flush } from '../store/sync.js'
import { useSession } from '../utils/session.js'
import { setName } from '../store/profileSlice.js'
import { selectTransactions } from '../store/transactionSlice.js'
import { formatRupiah, groupByCategory, monthKey, todayISO } from '../utils/finance.js'
import { Button, Field, IconButton, Input, Modal } from './ui.jsx'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Flower2 },
  { to: '/transactions', label: 'Transaksi', icon: ReceiptText },
  { to: '/budget', label: 'Budget', icon: Target },
  { to: '/goals', label: 'Tabungan', icon: PiggyBank },
  { to: '/assistant', label: 'Buddy', icon: HeartHandshake },
  { to: '/report', label: 'Laporan', icon: FileText, desktopOnly: true },
]

const greeting = () => {
  const h = new Date().getHours()
  if (h < 11) return 'Selamat Pagi 🌸'
  if (h < 15) return 'Selamat Siang ☀️'
  if (h < 18) return 'Selamat Sore 🌷'
  return 'Selamat Malam 🌙'
}

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '🌸'

const ProfileForm = ({ name, onClose }) => {
  const dispatch = useDispatch()
  const session = useSession()
  const [value, setValue] = useState(name)
  const [pw, setPw] = useState({ old: '', new: '' })
  const [pwMsg, setPwMsg] = useState(null) // { ok, text }
  const [busy, setBusy] = useState(false)

  const changePassword = async (e) => {
    e.preventDefault()
    setBusy(true)
    setPwMsg(null)
    try {
      await session.changePassword(pw.old, pw.new)
      setPw({ old: '', new: '' })
      setPwMsg({ ok: true, text: 'Kata sandi berhasil diganti ✨' })
    } catch (err) {
      setPwMsg({ ok: false, text: err.message })
    }
    setBusy(false)
  }

  return (
    <Modal title="Profil Kamu" onClose={onClose}>
      <div className="space-y-6">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            dispatch(setName(value))
            onClose()
          }}
        >
          <p className="text-body-sm text-on-surface-variant">
            Masuk sebagai <b className="text-on-surface">{session?.user?.email}</b>
          </p>
          <Field label="Nama panggilan">
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="mis. Clara" maxLength={30} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" size="sm">
              Simpan nama
            </Button>
          </div>
        </form>

        <form className="space-y-3 pt-4 border-t border-outline-variant/30" onSubmit={changePassword}>
          <p className="text-label-lg text-on-surface">Ganti kata sandi</p>
          <Input type="password" placeholder="Kata sandi lama" value={pw.old} onChange={(e) => setPw((p) => ({ ...p, old: e.target.value }))} autoComplete="current-password" aria-label="Kata sandi lama" />
          <Input type="password" placeholder="Kata sandi baru (min. 8 karakter)" value={pw.new} onChange={(e) => setPw((p) => ({ ...p, new: e.target.value }))} autoComplete="new-password" aria-label="Kata sandi baru" />
          {pwMsg && <p className={`text-body-sm ${pwMsg.ok ? 'text-mint-ink' : 'text-raspberry-ink'}`}>{pwMsg.text}</p>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" variant="secondary" disabled={busy || !pw.old || pw.new.length < 8}>
              Ganti kata sandi
            </Button>
          </div>
        </form>

        <div className="pt-4 border-t border-outline-variant/30">
          <Button variant="danger" className="w-full" onClick={() => session.logout()}>
            <LogOut size={18} /> Keluar dari akun
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Saving status of local changes to the server.
const SyncBadge = () => {
  const { status, error } = useSelector((state) => state.sync)
  if (status === 'idle') return null
  return status === 'saving' ? (
    <span className="hidden sm:flex items-center gap-1 text-label-sm text-on-surface-variant" title="Menyimpan perubahan">
      <Loader2 size={14} className="animate-spin" /> Menyimpan…
    </span>
  ) : (
    <button onClick={() => flush()} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-raspberry-soft text-raspberry-ink text-label-sm" title={error}>
      <CloudOff size={14} /> <span className="hidden sm:inline">Belum tersimpan ·</span> Coba lagi
    </button>
  )
}

// Budget alerts for the current month: categories at 80% or more of their limit.
const useBudgetAlerts = () => {
  const transactions = useSelector(selectTransactions)
  const budgets = useSelector((state) => state.planning.budgets)
  return useMemo(() => {
    const month = monthKey(todayISO())
    const spent = Object.fromEntries(
      groupByCategory(transactions.filter((t) => monthKey(t.date) === month), 'expense').map((c) => [c.name, c.value]),
    )
    return Object.entries(budgets)
      .map(([category, limit]) => ({ category, limit, spent: spent[category] || 0 }))
      .filter((b) => b.spent >= b.limit * 0.8)
      .sort((a, b) => b.spent / b.limit - a.spent / a.limit)
  }, [transactions, budgets])
}

const NotificationBell = () => {
  const alerts = useBudgetAlerts()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <IconButton label="Notifikasi" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="relative">
        <Bell size={20} />
        {alerts.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />}
      </IconButton>
      {open && (
        <div className="absolute right-0 mt-2 w-72 glass-strong rounded-card p-4 z-50">
          <p className="text-label-lg text-on-surface mb-2">Notifikasi</p>
          {alerts.length ? (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.category} className="text-body-sm text-on-surface-variant">
                  <span className={a.spent > a.limit ? 'text-raspberry-ink font-bold' : 'text-secondary font-bold'}>
                    {a.spent > a.limit ? '⚠️ Lewat batas' : '⏳ Hampir habis'}
                  </span>{' '}
                  {a.category}: {formatRupiah(a.spent)} / {formatRupiah(a.limit)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-on-surface-variant">Semua anggaran bulan ini aman ✨</p>
          )}
          <Link to="/budget" onClick={() => setOpen(false)} className="mt-3 inline-block text-label-md text-primary hover:underline">
            Kelola anggaran →
          </Link>
        </div>
      )}
    </div>
  )
}

export const TopBar = () => {
  const name = useSelector((state) => state.profile?.name || '')
  const [editing, setEditing] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-canvas/85 backdrop-blur-xl shadow-[0_1px_0_rgba(244,114,182,0.12)] print:hidden">
      <div className="max-w-content mx-auto flex items-center justify-between gap-4 px-5 md:px-8 py-2.5">
        <button onClick={() => setEditing(true)} className="flex items-center gap-2 text-left group" aria-label="Ubah profil">
          <span className="relative w-11 h-11 shrink-0 rounded-full p-[2px] bg-gradient-to-tr from-primary-container via-tertiary-container to-secondary-container shadow-sm">
            <span className="w-full h-full rounded-full bg-white flex items-center justify-center text-label-lg text-primary">{initials(name)}</span>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-secondary-container border-2 border-white" />
          </span>
          <span>
            <span className="block text-label-sm text-on-surface-variant">{greeting()}</span>
            <span className="block text-headline-sm font-extrabold tracking-tight text-on-surface group-hover:text-primary transition-colors">
              Hi, {name || 'Kamu'}! ✨
            </span>
          </span>
        </button>

        <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-white/70 border border-primary-container/15 shadow-level-1" aria-label="Navigasi utama">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-2 rounded-full text-label-lg transition-all ${
                  isActive ? 'bg-primary-container text-on-primary-container shadow-bead' : 'text-on-surface-variant hover:text-primary'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden sm:block lg:hidden text-headline-md font-extrabold text-primary tracking-tight">SimpananMu</span>
          <SyncBadge />
          <NotificationBell />
        </div>
      </div>
      {editing && <ProfileForm name={name} onClose={() => setEditing(false)} />}
    </header>
  )
}

export const BottomNav = () => (
  <nav
    className="lg:hidden fixed bottom-0 inset-x-0 z-50 rounded-t-[3rem] bg-white/90 backdrop-blur-xl shadow-dock pb-[env(safe-area-inset-bottom)] print:hidden"
    aria-label="Navigasi bawah"
  >
    <div className="max-w-lg mx-auto flex justify-around items-center px-2 py-2">
      {NAV_ITEMS.filter((i) => !i.desktopOnly).map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center rounded-full px-3 py-1.5 transition-all duration-300 active:scale-95 ${
              isActive ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant hover:text-primary'
            }`
          }
        >
          <Icon size={22} />
          <span className="text-label-sm mt-0.5">{label}</span>
        </NavLink>
      ))}
    </div>
  </nav>
)
