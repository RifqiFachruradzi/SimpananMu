import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { selectTransactions } from '../store/transactionSlice.js'
import {
  CHART_COLORS,
  formatCompact,
  formatDate,
  formatRupiah,
  groupByCategory,
  monthKey,
  monthlySeries,
  summarize,
  todayISO,
} from '../utils/finance.js'
import TransactionForm from './TransactionForm.jsx'
import { Button, Card, EmptyState, PageHeader, ProgressBar, StatCard, TypeBadge } from './ui.jsx'


const Dashboard = () => {
  const transactions = useSelector(selectTransactions)
  const { budgets, goals } = useSelector((state) => state.planning)
  const [showForm, setShowForm] = useState(false)

  const currentMonth = monthKey(todayISO())

  const stats = useMemo(() => {
    const thisMonth = transactions.filter((t) => monthKey(t.date) === currentMonth)
    const monthly = summarize(thisMonth)
    const overall = summarize(transactions)
    const expenseByCategory = groupByCategory(thisMonth, 'expense')
    const savingsRate = monthly.totalIncome > 0 ? (monthly.netProfit / monthly.totalIncome) * 100 : 0
    const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id))).slice(0, 6)
    return { monthly, overall, expenseByCategory, savingsRate, recent, series: monthlySeries(transactions, 6) }
  }, [transactions, currentMonth])

  const budgetRows = useMemo(() => {
    const spent = Object.fromEntries(stats.expenseByCategory.map((c) => [c.name, c.value]))
    return Object.entries(budgets)
      .map(([category, limit]) => ({ category, limit, spent: spent[category] || 0 }))
      .sort((a, b) => b.spent / b.limit - a.spent / a.limit)
  }, [budgets, stats.expenseByCategory])

  const totalGoal = goals.reduce((s, g) => s + g.target, 0)
  const totalSaved = goals.reduce((s, g) => s + Math.min(g.saved, g.target), 0)
  const monthName = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      <PageHeader
        icon="📊"
        title="Dashboard Keuangan"
        subtitle={`Ringkasan keuangan bulan ${monthName}: arus kas, anggaran, dan target tabungan.`}
        actions={<Button onClick={() => setShowForm(true)}>➕ Tambah Transaksi</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="Pendapatan Bulan Ini" value={formatRupiah(stats.monthly.totalIncome)} icon="📈" tone="emerald" />
        <StatCard title="Pengeluaran Bulan Ini" value={formatRupiah(stats.monthly.totalExpense)} icon="📉" tone="rose" />
        <StatCard
          title="Selisih Bulan Ini"
          value={formatRupiah(stats.monthly.netProfit)}
          icon={stats.monthly.netProfit >= 0 ? '🚀' : '⚠️'}
          tone={stats.monthly.netProfit >= 0 ? 'emerald' : 'rose'}
          hint={stats.monthly.totalIncome > 0 ? `Rasio tabungan ${stats.savingsRate.toFixed(0)}%` : undefined}
        />
        <StatCard
          title="Saldo Keseluruhan"
          value={formatRupiah(stats.overall.netProfit)}
          icon="🏦"
          tone={stats.overall.netProfit >= 0 ? 'fuchsia' : 'rose'}
          hint={`${transactions.length} transaksi tercatat`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Arus Kas 6 Bulan Terakhir</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5d0fe" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 12 }} width={56} />
                <Tooltip formatter={(v) => formatRupiah(v)} />
                <Legend />
                <Bar dataKey="income" name="Pendapatan" fill="#a855f7" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Pengeluaran" fill="#f472b6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Pengeluaran per Kategori</h2>
          {stats.expenseByCategory.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.expenseByCategory} dataKey="value" nameKey="name" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
                    {stats.expenseByCategory.map((entry, i) => (
                      <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatRupiah(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon="🥧" message="Belum ada pengeluaran bulan ini." />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">🎯 Anggaran Bulan Ini</h2>
            <Link to="/budget" className="text-sm font-semibold text-fuchsia-600 hover:underline">
              Kelola →
            </Link>
          </div>
          {budgetRows.length ? (
            <div className="space-y-4">
              {budgetRows.slice(0, 5).map(({ category, limit, spent }) => (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-gray-800">{category}</span>
                    <span className={spent > limit ? 'text-rose-600 font-bold' : 'text-gray-600'}>
                      {formatRupiah(spent)} / {formatRupiah(limit)}
                    </span>
                  </div>
                  <ProgressBar value={spent} max={limit} danger={spent > limit} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="🎯" message="Belum ada anggaran yang diatur." />
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">🐷 Target Tabungan</h2>
            <Link to="/goals" className="text-sm font-semibold text-fuchsia-600 hover:underline">
              Kelola →
            </Link>
          </div>
          {goals.length ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Terkumpul <span className="font-bold text-gray-900">{formatRupiah(totalSaved)}</span> dari{' '}
                <span className="font-bold text-gray-900">{formatRupiah(totalGoal)}</span>
              </p>
              {goals.slice(0, 4).map((g) => (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-gray-800">{g.name}</span>
                    <span className="text-gray-600">{Math.min(100, Math.round((g.saved / g.target) * 100))}%</span>
                  </div>
                  <ProgressBar value={g.saved} max={g.target} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="🐷" message="Belum ada target tabungan." />
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">📋 Transaksi Terbaru</h2>
          <Link to="/transactions" className="text-sm font-semibold text-fuchsia-600 hover:underline">
            Lihat semua →
          </Link>
        </div>
        {stats.recent.length ? (
          <ul className="divide-y divide-gray-100">
            {stats.recent.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{t.description}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(t.date)} · {t.category || 'Lainnya'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'income' ? '+' : '−'} {formatRupiah(t.amount)}
                  </p>
                  <div className="hidden sm:block mt-1">
                    <TypeBadge type={t.type} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="Belum ada transaksi.">
            <Button onClick={() => setShowForm(true)}>➕ Tambah transaksi pertama</Button>
          </EmptyState>
        )}
      </Card>

      {showForm && <TransactionForm onClose={() => setShowForm(false)} />}
    </div>
  )
}

export default Dashboard
