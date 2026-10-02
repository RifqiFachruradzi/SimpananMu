import { useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectTransactions } from '../store/transactionSlice.js'
import { formatRupiah, summarize } from '../utils/finance.js'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/transactions', label: 'Transaksi', icon: '💳' },
  { to: '/budget', label: 'Anggaran', icon: '🎯' },
  { to: '/goals', label: 'Tabungan', icon: '🐷' },
  { to: '/report', label: 'Laporan', icon: '📄' },
]

const linkClass = ({ isActive }) =>
  `flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold transition-all duration-200 ${
    isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
  }`

const Header = () => {
  const transactions = useSelector(selectTransactions)
  const { netProfit } = useMemo(() => summarize(transactions), [transactions])
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-white/80 backdrop-blur-xl shadow-lg sticky top-0 z-50 border-b border-indigo-100 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 gap-4">
          <Link
            to="/"
            className="text-2xl md:text-3xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent whitespace-nowrap"
          >
            💰 SIMPANAN-MU
          </Link>

          <nav className="hidden lg:flex gap-1">
            {NAV_ITEMS.map(({ to, label, icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
                <span>{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="text-right hidden xl:block">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saldo Bersih</p>
              <p className={`text-xl font-black ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatRupiah(netProfit)}
              </p>
            </div>
            <button
              className="lg:hidden p-2 rounded-xl text-gray-700 hover:bg-indigo-50 text-2xl leading-none"
              onClick={() => setOpen((o) => !o)}
              aria-label="Buka menu"
              aria-expanded={open}
            >
              {open ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {open && (
          <nav className="lg:hidden pb-4 grid gap-1">
            {NAV_ITEMS.map(({ to, label, icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={linkClass} onClick={() => setOpen(false)}>
                <span>{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
            <p className="px-4 pt-2 text-sm text-gray-600">
              Saldo bersih:{' '}
              <span className={`font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatRupiah(netProfit)}</span>
            </p>
          </nav>
        )}
      </div>
    </header>
  )
}

export default Header
