import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Check, Target } from 'lucide-react'
import { setBudget } from '../store/planningSlice.js'
import { selectTransactions } from '../store/transactionSlice.js'
import { categoryMeta } from '../utils/categories.js'
import { CATEGORIES, formatCompact, formatMonth, formatRupiah, groupByCategory, monthKey, todayISO } from '../utils/finance.js'
import { Button, Input, PageHeader, Pill, ProgressBar, SectionTitle } from './ui.jsx'

const BudgetCard = ({ category, limit, spent }) => {
  const dispatch = useDispatch()
  const meta = categoryMeta(category)
  const [draft, setDraft] = useState(limit ? String(limit) : '')
  const dirty = Number(draft || 0) !== (limit || 0)
  const over = limit > 0 && spent > limit
  const pct = limit > 0 ? Math.round((spent / limit) * 100) : null

  const save = (e) => {
    e.preventDefault()
    dispatch(setBudget({ category, limit: Math.max(0, Number(draft) || 0) }))
  }

  return (
    <form
      onSubmit={save}
      className={`bg-white p-4 rounded-card border shadow-sm flex flex-col gap-3 ${limit ? meta.border : 'border-outline-variant/30 border-dashed'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`icon-disc w-12 h-12 ${meta.disc}`}>
            <meta.Icon size={22} />
          </span>
          <div className="min-w-0">
            <h3 className="text-label-lg text-on-surface truncate">{category}</h3>
            <p className={`text-body-sm font-semibold tnum ${over ? 'text-raspberry-ink' : meta.text}`}>
              {formatRupiah(spent)}
              {limit > 0 && <span className="text-on-surface-variant font-normal"> / {formatCompact(limit)}</span>}
            </p>
          </div>
        </div>
        {pct !== null && <Pill className={over ? 'bg-raspberry-soft text-raspberry-ink' : meta.pill}>{pct}%</Pill>}
      </div>

      {limit > 0 ? (
        <>
          <ProgressBar value={spent} max={limit} danger={over} color={meta.bar} />
          <p className={`text-label-sm ${over ? 'text-raspberry-ink' : 'text-on-surface-variant'}`}>
            {over ? `Lewat ${formatRupiah(spent - limit)}` : `Sisa ${formatRupiah(limit - spent)}`}
          </p>
        </>
      ) : (
        <p className="text-label-sm text-on-surface-variant">Belum ada batas anggaran</p>
      )}

      <div className="flex gap-2">
        <Input
          type="number"
          min="0"
          inputMode="numeric"
          placeholder="Batas / bulan"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={`Anggaran ${category}`}
          className="!rounded-full !py-2 text-body-md"
        />
        <Button type="submit" size="sm" variant={dirty ? 'primary' : 'secondary'} disabled={!dirty} aria-label={`Simpan anggaran ${category}`}>
          <Check size={16} /> Simpan
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
  const totalSpent = Object.keys(budgets).reduce((s, c) => s + (spent[c] || 0), 0)
  const overCount = Object.entries(budgets).filter(([c, limit]) => (spent[c] || 0) > limit).length
  const budgeted = CATEGORIES.expense.filter((c) => budgets[c])
  const unbudgeted = CATEGORIES.expense.filter((c) => !budgets[c])

  const card = (category) => (
    <BudgetCard key={`${category}:${budgets[category] || 0}`} category={category} limit={budgets[category] || 0} spent={spent[category] || 0} />
  )

  return (
    <div className="max-w-content mx-auto px-5 md:px-8 pt-4 md:pt-6 space-y-6">
      <PageHeader
        title="Anggaran"
        subtitle="Atur batas pengeluaran bulanan per kategori. Kosongkan nilai lalu simpan untuk menghapus."
        actions={
          <Input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Bulan" className="!w-auto !rounded-full !py-2" />
        }
      />

      <section className="relative overflow-hidden rounded-card-lg p-6 bg-white border border-primary-container/15 shadow-level-2">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary-fixed/60 blur-2xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blush text-label-sm text-on-primary-container">
              <Target size={14} /> {formatMonth(month)}
            </span>
            <Pill className={overCount ? 'bg-raspberry-soft text-raspberry-ink' : 'bg-mint-soft text-mint-ink'}>
              {overCount ? `${overCount} kategori lewat batas` : 'Semua aman'}
            </Pill>
          </div>
          <p className="mt-4 text-label-md text-on-surface-variant">Terpakai dari anggaran</p>
          <p className="text-currency-mobile md:text-currency tnum text-on-surface">
            {formatRupiah(totalSpent)}
            <span className="text-body-lg font-semibold text-on-surface-variant"> / {formatRupiah(totalLimit)}</span>
          </p>
          <div className="mt-3">
            <ProgressBar value={totalSpent} max={totalLimit} danger={totalSpent > totalLimit} thick />
          </div>
        </div>
      </section>

      {budgeted.length > 0 && (
        <section>
          <SectionTitle title="Kategori Beranggaran" subtitle={`${budgeted.length} kategori`} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{budgeted.map(card)}</div>
        </section>
      )}

      {unbudgeted.length > 0 && (
        <section>
          <SectionTitle title="Belum Dianggarkan" subtitle="Tambahkan batas agar pengeluaran lebih terkontrol" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{unbudgeted.map(card)}</div>
        </section>
      )}
    </div>
  )
}

export default BudgetPlanner
