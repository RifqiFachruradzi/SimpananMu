import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { addTransaction, updateTransaction } from '../store/transactionSlice.js'
import { CATEGORIES, todayISO } from '../utils/finance.js'
import { Button, Field, Input, Modal, Select, Textarea } from './ui.jsx'

const emptyForm = () => ({
  type: 'expense',
  date: todayISO(),
  description: '',
  category: CATEGORIES.expense[0],
  amount: '',
  note: '',
})

const TransactionForm = ({ transaction, onClose }) => {
  const dispatch = useDispatch()
  const isEdit = Boolean(transaction)
  const [form, setForm] = useState(() =>
    transaction ? { ...emptyForm(), ...transaction, category: transaction.category || 'Lainnya', amount: String(transaction.amount) } : emptyForm(),
  )
  const [errors, setErrors] = useState({})

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const setType = (type) =>
    setForm((f) => ({ ...f, type, category: CATEGORIES[type].includes(f.category) ? f.category : CATEGORIES[type][0] }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const amount = Number(form.amount)
    const nextErrors = {}
    if (!form.description.trim()) nextErrors.description = 'Deskripsi wajib diisi'
    if (!form.date) nextErrors.date = 'Tanggal wajib diisi'
    if (!(amount > 0)) nextErrors.amount = 'Nominal harus lebih dari 0'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const payload = {
      type: form.type,
      date: form.date,
      description: form.description.trim(),
      category: form.category,
      amount,
      note: form.note.trim(),
    }
    dispatch(isEdit ? updateTransaction({ ...payload, id: transaction.id }) : addTransaction(payload))
    onClose()
  }

  return (
    <Modal title={isEdit ? '✏️ Ubah Transaksi' : '➕ Tambah Transaksi'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-2 p-1 bg-fuchsia-50 rounded-2xl">
          {['income', 'expense'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setType(type)}
              className={`py-2.5 rounded-xl font-bold transition-all ${
                form.type === type
                  ? type === 'income'
                    ? 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-white shadow shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]'
                    : 'glossy-btn'
                  : 'text-gray-600 hover:bg-white'
              }`}
            >
              {type === 'income' ? '💰 Pendapatan' : '💸 Pengeluaran'}
            </button>
          ))}
        </div>

        <Field label="Deskripsi" error={errors.description}>
          <Input value={form.description} onChange={set('description')} placeholder="mis. Penjualan Produk A" autoFocus />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nominal (Rp)" error={errors.amount}>
            <Input type="number" inputMode="numeric" min="0" step="any" value={form.amount} onChange={set('amount')} placeholder="0" />
          </Field>
          <Field label="Tanggal" error={errors.date}>
            <Input type="date" value={form.date} onChange={set('date')} />
          </Field>
        </div>

        <Field label="Kategori">
          <Select value={form.category} onChange={set('category')}>
            {CATEGORIES[form.type].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Catatan (opsional)">
          <Textarea rows={2} value={form.note} onChange={set('note')} placeholder="Keterangan tambahan" />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit">{isEdit ? 'Simpan Perubahan' : 'Tambah'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default TransactionForm
