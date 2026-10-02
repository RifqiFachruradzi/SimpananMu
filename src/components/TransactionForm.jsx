import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { addTransaction, updateTransaction } from '../store/transactionSlice.js'
import { CATEGORIES, todayISO } from '../utils/finance.js'
import { Button, Field, Input, Modal, Segmented, Select, Textarea } from './ui.jsx'

const emptyForm = (type = 'expense') => ({
  type,
  date: todayISO(),
  description: '',
  category: CATEGORIES[type][0],
  amount: '',
  note: '',
})

const TransactionForm = ({ transaction, defaultType = 'expense', onClose }) => {
  const dispatch = useDispatch()
  const isEdit = Boolean(transaction)
  const [form, setForm] = useState(() =>
    transaction ? { ...emptyForm(), ...transaction, category: transaction.category || 'Lainnya', amount: String(transaction.amount) } : emptyForm(defaultType),
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
        <Segmented
          value={form.type}
          onChange={setType}
          options={[
            { value: 'expense', label: '💸 Pengeluaran' },
            { value: 'income', label: '💰 Pemasukan' },
          ]}
        />

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
