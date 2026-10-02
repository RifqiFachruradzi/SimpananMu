import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setBudget } from '../store/planningSlice.js'
import { selectTransactions } from '../store/transactionSlice.js'
import { CATEGORIES, formatMonth, formatRupiah, groupByCategory, monthKey, todayISO } from '../utils/finance.js'
import { Button, Card, Input, PageHeader, ProgressBar } from './ui.jsx'

const BudgetRow = ({ category, limit, spent }) => {
  const dispatch = useDispatch()
  const [draft, setDraft] = useState(limit ? String(limit) : '')
  const dirty = Number(draft || 0) !== (limit || 0)
  const over = limit > 0 && spent > limit

  const save = (e) => {
    e.preventDefault()
    dispatch(setBudget({ category, limit: Math.max(0, Number(draft) || 0) }))
  }

  return (
    <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-center py-4 border-b border-gray-100 last:border-none">
      <div className="md:col-span-3">
        <p className="font-bold text-gray-900">{category}</p>
        <p className={`text-sm ${over ? 'text-rose-600 font-semibold' : 'text-gray-500'}`}>
          Terpakai {formatRupiah(spent)}
          {limit > 0 && (over ? ` · lebih ${formatRupiah(spent - limit)}` : ` · sisa ${formatRupiah(limit - spent)}`)}
        </p>
      </div>
      <div className="md:col-span-5">
        {limit > 0 ? <ProgressBar value={spent} max={limit} danger={over} /> : <p className="text-sm text-gray-400">Belum ada batas anggaran</p>}
      </div>
      <div className="md:col-span-4 flex gap-2">
        <Input type="number" min="0" inputMode="numeric" placeholder="Batas / bulan" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={`Anggaran ${category}`} />
        <Button type="submit" variant={dirty ? 'primary' : 'secondary'} disabled={!dirty}>
          Simpan
        </Button>
      </div>
    </form>
  )
}

const BudgetPlanner = () => {
  const transactions = useSelector(selectTransactions)
  const budgets = useSelector((state) => state.planning.budgets)
  const [month, setMonth] = useState(monthKey(todayISO()))

  const spent = useMemo(
    () => Object.fromEntries(groupByCategory(transactions.filter((t) => monthKey(t.date) === month), 'expense').map((c) => [c.name, c.value])),
    [transactions, month],
  )

  const totalLimit = Object.values(budgets).reduce((s, v) => s + v, 0)
  const totalSpentBudgeted = Object.keys(budgets).reduce((s, c) => s + (spent[c] || 0), 0)
  const overCount = Object.entries(budgets).filter(([c, limit]) => (spent[c] || 0) > limit).length

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        icon="🎯"
        title="Anggaran Bulanan"
        subtitle="Tetapkan batas pengeluaran per kategori dan pantau realisasinya setiap bulan. Kosongkan nilai lalu simpan untuk menghapus anggaran."
        actions={<Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Bulan" className="!w-auto" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Anggaran</p>
          <p className="mt-1 text-2xl font-black text-indigo-600">{formatRupiah(totalLimit)}</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Terpakai ({formatMonth(month)})</p>
          <p className={`mt-1 text-2xl font-black ${totalSpentBudgeted > totalLimit ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatRupiah(totalSpentBudgeted)}
          </p>
          <div className="mt-3">
            <ProgressBar value={totalSpentBudgeted} max={totalLimit} danger={totalSpentBudgeted > totalLimit} />
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori Melebihi Batas</p>
          <p className={`mt-1 text-2xl font-black ${overCount ? 'text-rose-600' : 'text-emerald-600'}`}>
            {overCount ? `${overCount} kategori ⚠️` : 'Aman ✅'}
          </p>
        </Card>
      </div>

      <Card className="px-6 py-2">
        {CATEGORIES.expense.map((category) => (
          <BudgetRow key={`${category}:${budgets[category] || 0}`} category={category} limit={budgets[category] || 0} spent={spent[category] || 0} />
        ))}
      </Card>
    </div>
  )
}

export default BudgetPlanner
