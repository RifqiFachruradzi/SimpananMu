import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Pencil, PiggyBank, Plus, Rocket, Trash2, Trophy } from 'lucide-react'
import { addGoal, contributeToGoal, deleteGoal, updateGoal } from '../store/planningSlice.js'
import { formatDate, formatRupiah, parseDate, todayISO } from '../utils/finance.js'
import { Button, Card, EmptyState, Field, IconButton, Input, Modal, PageHeader, ProgressBar, Segmented } from './ui.jsx'

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
        {error && <p className="text-sm text-raspberry-ink">{error}</p>}
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
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'deposit', label: '➕ Setor' },
            { value: 'withdraw', label: '➖ Tarik' },
          ]}
        />
        <Field label="Nominal (Rp)">
          <Input type="number" min="0" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <p className="text-body-sm text-on-surface-variant">
          Terkumpul saat ini {formatRupiah(goal.saved)} dari {formatRupiah(goal.target)}.
        </p>
        <div className="flex justify-end gap-2">
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
    <section className="bg-white rounded-card-lg p-5 border border-outline-variant/30 shadow-[0_10px_28px_-6px_rgba(244,114,182,0.12)] flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`icon-disc w-11 h-11 ${done ? 'bg-mint-soft text-mint-ink' : 'bg-tertiary-fixed/60 text-tertiary'}`}>
            {done ? <Trophy size={20} /> : <Rocket size={20} />}
          </span>
          <div className="min-w-0">
            <p className="text-label-sm uppercase text-tertiary">{done ? 'Tercapai' : 'Tabungan Impian'}</p>
            <h3 className="text-headline-sm font-bold text-on-surface truncate">{goal.name}</h3>
          </div>
        </div>
        <span className={`text-headline-md font-extrabold ${done ? 'text-mint-ink' : 'text-primary'}`}>{pct}%</span>
      </div>
      <div className="flex flex-wrap justify-between gap-x-3 text-body-sm text-on-surface-variant">
        <span>
          Terkumpul: <strong className="text-on-surface tnum">{formatRupiah(goal.saved)}</strong>
        </span>
        <span className="tnum">Target: {formatRupiah(goal.target)}</span>
      </div>
      <ProgressBar value={goal.saved} max={goal.target} thick />
      <div className="text-label-sm text-on-surface-variant space-y-0.5">
        {done ? (
          <p className="text-mint-ink">Target tercapai! 🎉</p>
        ) : (
          <>
            <p>
              Sisa <strong className="text-primary tnum">{formatRupiah(remaining)}</strong> lagi ✨
            </p>
            {months !== null && months > 0 && <p>Nabung ± {formatRupiah(Math.ceil(remaining / months))} / bulan</p>}
          </>
        )}
        {goal.deadline && (
          <p className={overdue ? 'text-raspberry-ink' : ''}>
            Tenggat {formatDate(goal.deadline)}
            {overdue && ' · terlewat'}
          </p>
        )}
      </div>
      <div className="flex gap-2 pt-3 mt-auto border-t border-outline-variant/20">
        <Button className="flex-1" size="sm" onClick={() => onContribute(goal)}>
          <PiggyBank size={16} /> Setor / Tarik
        </Button>
        <IconButton label={`Ubah ${goal.name}`} onClick={() => onEdit(goal)} className="!w-9 !h-9">
          <Pencil size={16} />
        </IconButton>
        <IconButton
          label={`Hapus ${goal.name}`}
          onClick={() => window.confirm(`Hapus target "${goal.name}"?`) && dispatch(deleteGoal(goal.id))}
          className="!w-9 !h-9 !text-raspberry-ink hover:!bg-raspberry-soft"
        >
          <Trash2 size={16} />
        </IconButton>
      </div>
    </section>
  )
}

const SavingsGoals = () => {
  const goals = useSelector((state) => state.planning.goals)
  const [editing, setEditing] = useState(null) // null = closed, {} = new, goal = edit
  const [contributing, setContributing] = useState(null)

  const totalTarget = goals.reduce((s, g) => s + g.target, 0)
  const totalSaved = goals.reduce((s, g) => s + Math.min(g.saved, g.target), 0)

  return (
    <div className="max-w-content mx-auto px-5 md:px-8 pt-4 md:pt-6 space-y-6">
      <PageHeader
        title="Tabungan"
        subtitle="Buat target impian, catat setoran, dan lihat berapa yang perlu disisihkan tiap bulan."
        actions={
          <Button onClick={() => setEditing({})}>
            <Plus size={18} /> Target Baru
          </Button>
        }
      />

      {goals.length > 0 && (
        <section className="relative overflow-hidden rounded-card-lg p-6 bg-gradient-to-br from-tertiary-container via-primary-fixed-dim to-secondary-container shadow-hero text-on-tertiary-container">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/30 rounded-full blur-2xl pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 bg-white/50 px-3 py-1 rounded-full text-label-sm">
              <PiggyBank size={14} /> {goals.length} target
            </span>
            <p className="mt-4 text-label-md opacity-80">Total terkumpul</p>
            <p className="text-currency-mobile md:text-currency tnum">
              {formatRupiah(totalSaved)}
              <span className="text-body-lg font-semibold opacity-70"> / {formatRupiah(totalTarget)}</span>
            </p>
            <div className="mt-3 h-3.5 p-[2px] rounded-full bg-white/50 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${totalTarget ? Math.min(100, (totalSaved / totalTarget) * 100) : 0}%` }} />
            </div>
          </div>
        </section>
      )}

      {goals.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onEdit={setEditing} onContribute={setContributing} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState icon="🐷" message="Belum ada target tabungan.">
            <Button onClick={() => setEditing({})}>
              <Plus size={18} /> Buat target pertama
            </Button>
          </EmptyState>
        </Card>
      )}

      {editing && <GoalForm goal={editing.id ? editing : null} onClose={() => setEditing(null)} />}
      {contributing && <ContributeForm goal={contributing} onClose={() => setContributing(null)} />}
    </div>
  )
}

export default SavingsGoals
