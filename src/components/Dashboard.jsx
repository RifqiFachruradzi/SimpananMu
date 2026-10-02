import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  ArrowRight,
  ChevronRight,
  FileBarChart,
  Heart,
  MinusCircle,
  PlusCircle,
  Rocket,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { selectTransactions } from '../store/transactionSlice.js'
import { categoryMeta } from '../utils/categories.js'
import { formatAmount, formatCompact, formatRupiah, monthKey, monthlySeries, summarize, todayISO } from '../utils/finance.js'
import TransactionForm from './TransactionForm.jsx'
import TransactionItem from './TransactionItem.jsx'
import { Card, EmptyState, Pill, ProgressBar, SectionTitle } from './ui.jsx'

const rupiahNumber = formatAmount

const HeroCard = ({ balance, growth, onAdd }) => (
  <section className="relative overflow-hidden rounded-card-lg p-6 bg-gradient-to-br from-primary-container via-[#fca5a5] to-tertiary-container shadow-hero border border-white/40 text-on-primary-container">
    <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/30 rounded-full blur-2xl pointer-events-none" />
    <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
    <div className="relative">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 bg-white/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 text-label-sm">
          <Wallet size={14} /> Saldo Utama
        </span>
        {growth !== null && (
          <span className="flex items-center gap-1 bg-white/80 text-primary px-2.5 py-1 rounded-full shadow-sm text-label-sm">
            {growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {growth >= 0 ? '+' : ''}
            {growth.toFixed(1)}% bln ini
          </span>
        )}
      </div>
      <p className="mt-4 text-label-md text-on-primary-container/80">Total Saldo</p>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-body-lg font-bold text-on-primary-container/70">{balance < 0 ? '-Rp' : 'Rp'}</span>
        <h1 className="text-currency-mobile md:text-currency tnum drop-shadow-sm break-all">{rupiahNumber(balance)}</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-6">
        <button
          onClick={() => onAdd('expense')}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-white/90 text-primary text-label-lg shadow-sm hover:bg-white transition-all active:scale-95"
        >
          <MinusCircle size={20} /> Catat Keluar
        </button>
        <button
          onClick={() => onAdd('income')}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-on-primary-container text-white text-label-lg shadow-md hover:bg-on-primary-container/90 transition-all active:scale-95"
        >
          <PlusCircle size={20} /> Catat Masuk
        </button>
      </div>
    </div>
  </section>
)

const QuickAction = ({ icon: Icon, label, to, onClick, featured, tone }) => {
  const disc = featured
    ? 'bg-gradient-to-tr from-primary-container to-secondary-container text-white shadow-bead'
    : `bg-white border border-outline-variant/30 shadow-level-1 ${tone}`
  const inner = (
    <>
      <span className={`icon-disc w-14 h-14 transition-transform group-hover:-translate-y-0.5 ${disc}`}>
        <Icon size={26} />
      </span>
      <span className="text-label-sm text-on-surface text-center">{label}</span>
    </>
  )
  const cls = 'flex flex-col items-center gap-1.5 group active:scale-95 transition-transform'
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

const GoalCard = ({ goal }) => {
  if (!goal) {
    return (
      <Card className="p-5">
        <EmptyState icon="🐷" message="Belum ada target tabungan impian.">
          <Link to="/goals" className="text-label-lg text-primary hover:underline">
            Buat target pertama →
          </Link>
        </EmptyState>
      </Card>
    )
  }
  const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100))
  const remaining = Math.max(0, goal.target - goal.saved)
  return (
    <section className="bg-white rounded-card-lg p-5 border border-outline-variant/30 shadow-[0_10px_28px_-6px_rgba(244,114,182,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="icon-disc w-10 h-10 bg-tertiary-fixed/60 text-tertiary">
            <Rocket size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-label-sm uppercase text-tertiary">Tabungan Impian</p>
            <h3 className="text-headline-sm font-bold text-on-surface truncate">{goal.name}</h3>
          </div>
        </div>
        <span className="text-headline-md font-extrabold text-primary">{pct}%</span>
      </div>
      <div className="flex flex-wrap justify-between gap-x-3 text-body-sm text-on-surface-variant mt-3">
        <span>
          Terkumpul: <strong className="text-on-surface tnum">{formatRupiah(goal.saved)}</strong>
        </span>
        <span className="tnum">Target: {formatRupiah(goal.target)}</span>
      </div>
      <div className="mt-2">
        <ProgressBar value={goal.saved} max={goal.target} thick />
      </div>
      <div className="mt-3 pt-3 border-t border-outline-variant/20 flex justify-between items-center gap-2">
        <p className="text-label-sm text-on-surface-variant font-medium">
          {remaining ? (
            <>
              Sisa <strong className="text-primary tnum">{formatRupiah(remaining)}</strong> lagi! ✨
            </>
          ) : (
            'Target tercapai! 🎉'
          )}
        </p>
        <Link to="/goals" className="text-label-sm text-primary hover:text-on-primary-container flex items-center">
          Top up <ChevronRight size={14} />
        </Link>
      </div>
    </section>
  )
}

const CategoryCard = ({ category, spent, limit }) => {
  const meta = categoryMeta(category)
  const pct = Math.round((spent / limit) * 100)
  const over = spent > limit
  return (
    <div className={`bg-white p-4 rounded-card border ${meta.border} shadow-sm hover:shadow-level-2 transition-shadow flex flex-col`}>
      <div className="flex items-start justify-between">
        <span className={`icon-disc w-12 h-12 text-2xl ${meta.disc}`}>{meta.emoji}</span>
        <Pill className={over ? 'bg-raspberry-soft text-raspberry-ink' : meta.pill}>{pct}%</Pill>
      </div>
      <h4 className="mt-3 text-label-md font-bold text-on-surface">{category}</h4>
      <p className={`text-body-sm font-semibold tnum ${over ? 'text-raspberry-ink' : meta.text}`}>
        {formatRupiah(spent)} <span className="text-on-surface-variant font-normal">/ {formatCompact(limit)}</span>
      </p>
      <div className="mt-2">
        <ProgressBar value={spent} max={limit} danger={over} color={meta.bar} />
      </div>
    </div>
  )
}

const Dashboard = () => {
  const transactions = useSelector(selectTransactions)
  const { budgets, goals } = useSelector((state) => state.planning)
  const [form, setForm] = useState(null) // null | { type } | { transaction }

  const currentMonth = monthKey(todayISO())

  const stats = useMemo(() => {
    const thisMonth = transactions.filter((t) => monthKey(t.date) === currentMonth)
    const monthly = summarize(thisMonth)
    const balance = summarize(transactions).netProfit
    const startBalance = balance - monthly.netProfit
    const growth = startBalance > 0 ? (monthly.netProfit / startBalance) * 100 : null
    const spent = {}
    thisMonth
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const c = t.category || 'Lainnya'
        spent[c] = (spent[c] || 0) + t.amount
      })
    // Reverse first so the stable sort lists the latest-added entry first within a day.
    const recent = [...transactions].reverse().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
    return { monthly, balance, growth, spent, recent, series: monthlySeries(transactions, 6) }
  }, [transactions, currentMonth])

  const featuredGoal = useMemo(() => {
    const active = goals.filter((g) => g.saved < g.target)
    return [...(active.length ? active : goals)].sort((a, b) => b.saved / b.target - a.saved / a.target)[0]
  }, [goals])

  const categoryCards = Object.entries(budgets).map(([category, limit]) => ({ category, limit, spent: stats.spent[category] || 0 }))
  const monthName = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const savingsRate = stats.monthly.totalIncome > 0 ? Math.round((stats.monthly.netProfit / stats.monthly.totalIncome) * 100) : null

  return (
    <div className="max-w-content mx-auto px-5 md:px-8 pt-4 md:pt-6">
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="space-y-6 lg:col-span-5">
          <HeroCard balance={stats.balance} growth={stats.growth} onAdd={(type) => setForm({ type })} />

          <section>
            <SectionTitle
              title="Aksi Cepat ✨"
              action={
                <Link to="/transactions" className="text-label-sm text-primary hover:underline">
                  Semua
                </Link>
              }
            />
            <div className="grid grid-cols-4 gap-2">
              <QuickAction icon={Wallet} label="+ Masuk" onClick={() => setForm({ type: 'income' })} tone="text-primary" />
              <QuickAction icon={Sparkles} label="Tanya Buddy" to="/assistant" featured />
              <QuickAction icon={Heart} label="Tabungan" to="/goals" tone="text-tertiary" />
              <QuickAction icon={FileBarChart} label="Laporan" to="/report" tone="text-secondary" />
            </div>
          </section>

          <GoalCard goal={featuredGoal} />
        </div>

        <div className="space-y-6 lg:col-span-7">
          <section>
            <SectionTitle
              title="Kategori Pengeluaran"
              subtitle={`Alokasi bulan ${monthName}`}
              action={
                <Link to="/budget" className="text-label-sm text-primary hover:underline flex items-center gap-1">
                  Lihat Semua <ArrowRight size={14} />
                </Link>
              }
            />
            {categoryCards.length ? (
              <div className="grid grid-cols-2 gap-3">
                {categoryCards.slice(0, 4).map((c) => (
                  <CategoryCard key={c.category} {...c} />
                ))}
              </div>
            ) : (
              <Card>
                <EmptyState icon="🎯" message="Belum ada anggaran kategori.">
                  <Link to="/budget" className="text-label-lg text-primary hover:underline">
                    Atur anggaran →
                  </Link>
                </EmptyState>
              </Card>
            )}
          </section>

          <section className="bg-white rounded-card-lg p-5 border border-outline-variant/30 shadow-level-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">Transaksi Terakhir</h3>
                <p className="text-label-sm text-on-surface-variant font-medium">Catatan pengeluaran & pemasukan</p>
              </div>
              <Link to="/transactions" className="text-label-sm text-primary px-3 py-1 rounded-full bg-primary-fixed/30 hover:bg-primary-fixed/60 transition-colors">
                Riwayat
              </Link>
            </div>
            {stats.recent.length ? (
              <ul className="divide-y divide-outline-variant/20">
                {stats.recent.map((t) => (
                  <TransactionItem key={t.id} t={t} onClick={() => setForm({ transaction: t })} />
                ))}
              </ul>
            ) : (
              <EmptyState message="Belum ada transaksi. Yuk catat yang pertama!" />
            )}
          </section>
        </div>
      </div>

      <section className="mt-6 bg-white rounded-card-lg p-5 border border-outline-variant/30 shadow-level-1">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-headline-sm font-bold text-on-surface">Insight Arus Kas</h3>
            <p className="text-label-sm text-on-surface-variant font-medium">6 bulan terakhir</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill className="bg-tertiary-fixed text-on-tertiary-container">Masuk bulan ini {formatCompact(stats.monthly.totalIncome)}</Pill>
            <Pill className="bg-primary-fixed text-on-primary-container">Keluar {formatCompact(stats.monthly.totalExpense)}</Pill>
            {savingsRate !== null && <Pill className="bg-secondary-fixed text-on-secondary-container">Rasio tabungan {savingsRate}%</Pill>}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.series} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1ede9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#786470' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11, fill: '#786470' }} width={52} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => formatRupiah(v)}
                cursor={{ fill: 'rgba(244,114,182,0.06)' }}
                contentStyle={{ borderRadius: 16, border: '1px solid rgba(244,114,182,0.15)', boxShadow: '0 12px 32px -6px rgba(244,114,182,0.14)' }}
              />
              <Bar dataKey="income" name="Pemasukan" fill="#c084fc" radius={[8, 8, 8, 8]} />
              <Bar dataKey="expense" name="Pengeluaran" fill="#f472b6" radius={[8, 8, 8, 8]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {form && <TransactionForm transaction={form.transaction || null} defaultType={form.type} onClose={() => setForm(null)} />}
    </div>
  )
}

export default Dashboard
