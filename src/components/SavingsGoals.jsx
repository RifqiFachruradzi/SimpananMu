import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { addGoal, contributeToGoal, deleteGoal, updateGoal } from '../store/planningSlice.js'
import { formatDate, formatRupiah, parseDate, todayISO } from '../utils/finance.js'
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, ProgressBar } from './ui.jsx'

const GoalForm = ({ goal, onClose }) => {
  const dispatch = useDispatch()
  const [form, setForm] = useState({
    name: goal?.name || '',
    target: goal ? String(goal.target) : '',
    saved: goal ? String(goal.saved) : '0',
    deadline: goal?.deadline || '',
  })
  const [error, setError] = useState('')
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const target = Number(form.target)
    const saved = Number(form.saved) || 0
    if (!form.name.trim()) return setError('Nama target wajib diisi')
    if (!(target > 0)) return setError('Target harus lebih dari 0')
    if (saved < 0) return setError('Dana terkumpul tidak boleh negatif')
    const payload = { name: form.name.trim(), target, saved, deadline: form.deadline }
    dispatch(goal ? updateGoal({ ...payload, id: goal.id }) : addGoal(payload))
    onClose()
  }

  return (
    <Modal title={goal ? '✏️ Ubah Target' : '🐷 Target Tabungan Baru'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Nama target">
          <Input value={form.name} onChange={set('name')} placeholder="mis. Dana Darurat" autoFocus />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Target (Rp)">
            <Input type="number" min="0" inputMode="numeric" value={form.target} onChange={set('target')} />
          </Field>
          <Field label="Sudah terkumpul (Rp)">
            <Input type="number" min="0" inputMode="numeric" value={form.saved} onChange={set('saved')} />
          </Field>
        </div>
        <Field label="Tenggat (opsional)">
          <Input type="date" value={form.deadline} onChange={set('deadline')} />
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit">{goal ? 'Simpan' : 'Buat Target'}</Button>
        </div>
      </form>
    </Modal>
  )
}

const ContributeForm = ({ goal, onClose }) => {
  const dispatch = useDispatch()
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('deposit')

  const submit = (e) => {
    e.preventDefault()
    const value = Number(amount)
    if (!(value > 0)) return
    dispatch(contributeToGoal({ id: goal.id, amount: mode === 'deposit' ? value : -value }))
    onClose()
  }

  return (
    <Modal title={`💵 ${goal.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 p-1 bg-fuchsia-50 rounded-2xl">
          {[
            ['deposit', '➕ Setor'],
            ['withdraw', '➖ Tarik'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`py-2.5 rounded-xl font-bold transition-all ${mode === value ? 'glossy-btn' : 'text-gray-600 hover:bg-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <Field label="Nominal (Rp)">
          <Input type="number" min="0" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <p className="text-sm text-gray-500">
          Terkumpul saat ini {formatRupiah(goal.saved)} dari {formatRupiah(goal.target)}.
        </p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={!(Number(amount) > 0)}>
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  )
}

const monthsUntil = (deadline) => {
  const today = parseDate(todayISO())
  const end = parseDate(deadline)
  return (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth())
}

const GoalCard = ({ goal, onEdit, onContribute }) => {
  const dispatch = useDispatch()
  const remaining = Math.max(0, goal.target - goal.saved)
  const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100))
  const done = remaining === 0
  const months = goal.deadline ? monthsUntil(goal.deadline) : null
  const overdue = goal.deadline && !done && goal.deadline < todayISO()

  return (
    <Card className="p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-gray-900">
            {done ? '🏆' : '🐷'} {goal.name}
          </h3>
          {goal.deadline && (
            <p className={`text-sm ${overdue ? 'text-rose-600 font-semibold' : 'text-gray-500'}`}>
              Tenggat {formatDate(goal.deadline)}
              {overdue && ' · terlewat'}
            </p>
          )}
        </div>
        <span className={`text-2xl font-black ${done ? 'text-emerald-600' : 'text-fuchsia-600'}`}>{pct}%</span>
      </div>
      <ProgressBar value={goal.saved} max={goal.target} />
      <div className="text-sm text-gray-600 space-y-1">
        <p>
          <b className="text-gray-900">{formatRupiah(goal.saved)}</b> / {formatRupiah(goal.target)}
        </p>
        {done ? (
          <p className="text-emerald-600 font-semibold">Target tercapai! 🎉</p>
        ) : (
          <>
            <p>Kurang {formatRupiah(remaining)}</p>
            {months !== null && months > 0 && <p>Perlu menabung ± {formatRupiah(Math.ceil(remaining / months))} / bulan</p>}
          </>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-auto pt-2">
        <Button className="flex-1" onClick={() => onContribute(goal)}>
          💵 Setor / Tarik
        </Button>
        <Button variant="secondary" onClick={() => onEdit(goal)} aria-label={`Ubah ${goal.name}`}>
          ✏️
        </Button>
        <Button
          variant="danger"
          onClick={() => window.confirm(`Hapus target "${goal.name}"?`) && dispatch(deleteGoal(goal.id))}
          aria-label={`Hapus ${goal.name}`}
        >
          🗑️
        </Button>
      </div>
    </Card>
  )
}

const SavingsGoals = () => {
  const goals = useSelector((state) => state.planning.goals)
  const [editing, setEditing] = useState(null) // null = closed, {} = new, goal = edit
  const [contributing, setContributing] = useState(null)

  const totalTarget = goals.reduce((s, g) => s + g.target, 0)
  const totalSaved = goals.reduce((s, g) => s + Math.min(g.saved, g.target), 0)

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        icon="🐷"
        title="Target Tabungan"
        subtitle="Buat target tabungan, catat setoran, dan lihat berapa yang perlu disisihkan setiap bulan."
        actions={<Button onClick={() => setEditing({})}>➕ Target Baru</Button>}
      />

      {goals.length > 0 && (
        <Card className="p-6">
          <div className="flex flex-wrap justify-between gap-2 mb-3">
            <p className="font-bold text-gray-900">Progres Keseluruhan</p>
            <p className="text-gray-600">
              <b className="text-gray-900">{formatRupiah(totalSaved)}</b> / {formatRupiah(totalTarget)}
            </p>
          </div>
          <ProgressBar value={totalSaved} max={totalTarget} />
        </Card>
      )}

      {goals.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onEdit={setEditing} onContribute={setContributing} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState icon="🐷" message="Belum ada target tabungan.">
            <Button onClick={() => setEditing({})}>➕ Buat target pertama</Button>
          </EmptyState>
        </Card>
      )}

      {editing && <GoalForm goal={editing.id ? editing : null} onClose={() => setEditing(null)} />}
      {contributing && <ContributeForm goal={contributing} onClose={() => setContributing(null)} />}
    </div>
  )
}

export default SavingsGoals
