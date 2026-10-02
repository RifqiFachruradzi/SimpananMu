import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { CloudOff, Upload } from 'lucide-react'
import { hydrate, importLocal, signOut } from '../store/index.js'
import { startSync, stopSync } from '../store/sync.js'
import { api, getToken, localStore, setToken, UNAUTHORIZED_EVENT } from '../utils/api.js'
import { SessionContext } from '../utils/session.js'
import AuthScreen from './AuthScreen.jsx'
import { Button, Modal } from './ui.jsx'

const USER_KEY = 'simpananmu:user'
// Data saved by the earlier version of the app, which kept everything in this browser.
const LEGACY_KEY = 'simpananmu:v1'
const legacySkipKey = (email) => `simpananmu:v1:skip:${email}`

const readLegacy = () => {
  try {
    const s = JSON.parse(localStore.get(LEGACY_KEY) || 'null')
    const data = {
      transactions: s?.transactions?.transactions || [],
      budgets: s?.planning?.budgets || {},
      goals: s?.planning?.goals || [],
      profile: s?.profile || {},
    }
    const count = data.transactions.length + data.goals.length + Object.keys(data.budgets).length
    return count ? data : null
  } catch {
    return null
  }
}

const isEmpty = (d) => !d.transactions.length && !d.goals.length && !Object.keys(d.budgets).length

const Centered = ({ children }) => <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 px-6 text-center">{children}</div>

const ImportPrompt = ({ legacy, onImport, onSkip }) => (
  <Modal title="Data lama ditemukan" onClose={onSkip}>
    <div className="space-y-4">
      <div className="icon-disc w-14 h-14 bg-primary-fixed/60 text-primary">
        <Upload size={26} />
      </div>
      <p className="text-body-md text-on-surface-variant">
        Browser ini masih menyimpan data dari versi sebelumnya: <b className="text-on-surface">{legacy.transactions.length} transaksi</b>,{' '}
        {Object.keys(legacy.budgets).length} anggaran, dan {legacy.goals.length} target tabungan. Pindahkan ke akunmu supaya bisa dibuka di perangkat
        lain?
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onSkip}>
          Lewati
        </Button>
        <Button onClick={onImport}>Pindahkan ke akun</Button>
      </div>
    </div>
  </Modal>
)

const AuthGate = ({ children }) => {
  const dispatch = useDispatch()
  const [status, setStatus] = useState(getToken() ? 'loading' : 'guest') // loading | guest | ready | offline
  const [user, setUser] = useState(null)
  const [notice, setNotice] = useState('')
  const [legacy, setLegacy] = useState(null)

  const endSession = useCallback(
    (message = '') => {
      stopSync()
      setToken(null)
      localStore.set(USER_KEY, null)
      dispatch(signOut())
      setUser(null)
      setLegacy(null)
      setNotice(message)
      setStatus('guest')
    },
    [dispatch],
  )

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      // Send edits saved while offline before reading, so they aren't hidden by older server data.
      const known = JSON.parse(localStore.get(USER_KEY) || 'null')
      if (known?.email) await startSync(dispatch, known.email)
      const { user: me, data } = await api('data')
      dispatch(hydrate(data))
      if (known?.email !== me.email) await startSync(dispatch, me.email)
      localStore.set(USER_KEY, JSON.stringify(me))
      setUser(me)
      setStatus('ready')
      const old = readLegacy()
      if (old && isEmpty(data) && !localStore.get(legacySkipKey(me.email))) setLegacy(old)
    } catch (err) {
      if (err.status === 401) endSession('Sesi berakhir. Silakan masuk lagi.')
      else {
        setNotice(err.message)
        setStatus('offline')
      }
    }
  }, [dispatch, endSession])

  useEffect(() => {
    // Restore a saved session once on start-up.
    if (getToken()) load() // eslint-disable-line react-hooks/set-state-in-effect
  }, [load])

  useEffect(() => {
    const onUnauthorized = () => endSession('Sesi berakhir. Silakan masuk lagi.')
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [endSession])

  const session = useMemo(
    () => ({
      user,
      logout: async () => {
        try {
          await api('auth', { method: 'POST', body: { action: 'logout' } })
        } catch {
          // the token is discarded locally either way
        }
        endSession()
      },
      changePassword: (oldPw, newPw) => api('auth', { method: 'POST', body: { action: 'password', old: oldPw, new: newPw } }),
    }),
    [user, endSession],
  )

  if (status === 'guest') {
    return (
      <AuthScreen
        notice={notice}
        onSignedIn={({ token, user: me }) => {
          setToken(token)
          localStore.set(USER_KEY, JSON.stringify(me))
          setNotice('')
          load()
        }}
      />
    )
  }

  if (status === 'loading') {
    return (
      <Centered>
        <div className="h-12 w-12 rounded-full border-4 border-primary-fixed border-t-primary-container animate-spin" />
        <p className="text-body-md text-on-surface-variant">Memuat datamu…</p>
      </Centered>
    )
  }

  if (status === 'offline') {
    return (
      <Centered>
        <div className="icon-disc w-14 h-14 bg-raspberry-soft text-raspberry-ink">
          <CloudOff size={26} />
        </div>
        <p className="text-headline-sm text-on-surface">Tidak bisa memuat data</p>
        <p className="text-body-md text-on-surface-variant max-w-sm">{notice}</p>
        <div className="flex gap-2">
          <Button onClick={load}>Coba lagi</Button>
          <Button variant="secondary" onClick={() => endSession()}>
            Keluar
          </Button>
        </div>
      </Centered>
    )
  }

  return (
    <SessionContext.Provider value={session}>
      {children}
      {legacy && (
        <ImportPrompt
          legacy={legacy}
          onImport={() => {
            dispatch(importLocal({ ...legacy, profile: { name: legacy.profile.name || user.name } }))
            localStore.set(LEGACY_KEY, null)
            setLegacy(null)
          }}
          onSkip={() => {
            localStore.set(legacySkipKey(user.email), '1')
            setLegacy(null)
          }}
        />
      )}
    </SessionContext.Provider>
  )
}

export default AuthGate
