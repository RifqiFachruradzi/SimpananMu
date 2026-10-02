import { useState } from 'react'
import { Lock, Mail, Sparkles, User } from 'lucide-react'
import { api } from '../utils/api.js'
import { Button, Input, Segmented } from './ui.jsx'

const IconInput = ({ icon: Icon, ...props }) => (
  <label className="relative block">
    <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
    <Input className="!rounded-full pl-11" {...props} />
  </label>
)

const AuthScreen = ({ onSignedIn, notice }) => {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await api('auth', { method: 'POST', body: { action: mode, ...form } })
      onSignedIn(res)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="icon-disc w-16 h-16 mx-auto bg-gradient-to-tr from-primary-container to-secondary-container text-white shadow-hero">
            <Sparkles size={30} />
          </div>
          <h1 className="mt-4 text-headline-lg text-on-surface">SimpananMu</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">Catat keuangan, atur anggaran, dan wujudkan tabungan impianmu ✨</p>
        </div>

        <form onSubmit={submit} className="glass rounded-card-lg p-6 space-y-4" noValidate>
          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m)
              setError('')
            }}
            options={[
              { value: 'login', label: 'Masuk' },
              { value: 'register', label: 'Daftar' },
            ]}
          />
          {notice && <p className="text-body-sm text-secondary bg-secondary-fixed/50 rounded-tile px-4 py-2">{notice}</p>}
          {mode === 'register' && <IconInput icon={User} placeholder="Nama panggilan" value={form.name} onChange={set('name')} maxLength={30} autoComplete="nickname" aria-label="Nama" />}
          <IconInput icon={Mail} type="email" placeholder="Email" value={form.email} onChange={set('email')} autoComplete="email" aria-label="Email" />
          <IconInput
            icon={Lock}
            type="password"
            placeholder="Kata sandi (min. 8 karakter)"
            value={form.password}
            onChange={set('password')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            aria-label="Kata sandi"
          />
          {error && (
            <p role="alert" className="text-body-sm text-raspberry-ink bg-raspberry-soft/60 rounded-tile px-4 py-2">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full !py-3" disabled={busy}>
            {busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Buat Akun'}
          </Button>
        </form>

        <p className="text-center text-body-sm text-on-surface-variant">
          Data keuanganmu tersimpan di akunmu dan bisa dibuka dari perangkat mana pun.
        </p>
      </div>
    </div>
  )
}

export default AuthScreen
