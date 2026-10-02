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
  { to: '/assistant', label: 'AI Buddy', icon: '💖' },
]

const linkClass = ({ isActive }) =>
  `flex items-center gap-2 px-4 py-2 rounded-2xl font-semibold whitespace-nowrap transition-all duration-200 ${
    isActive ? 'glossy-btn' : 'text-gray-700 hover:text-fuchsia-600 hover:bg-fuchsia-50'
  }`

const Header = () => {
  const transactions = useSelector(selectTransactions)
  const { netProfit } = useMemo(() => summarize(transactions), [transactions])
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-white/70 backdrop-blur-2xl sticky top-0 z-50 border-b border-white shadow-[0_8px_30px_-12px_rgba(192,38,211,0.25)] print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 gap-4">
          <Link
            to="/"
            className="text-2xl md:text-3xl font-black whitespace-nowrap"
          >
            <span>💰</span> <span className="text-gradient">SIMPANAN-MU</span>
          </Link>

          <nav className="hidden xl:flex gap-1">
            {NAV_ITEMS.map(({ to, label, icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={linkClass}>
                <span>{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="text-right hidden 2xl:block">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Saldo Bersih</p>
              <p className={`text-xl font-black ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatRupiah(netProfit)}
              </p>
            </div>
            <button
              className="xl:hidden p-2 rounded-xl text-gray-700 hover:bg-fuchsia-50 text-2xl leading-none"
              onClick={() => setOpen((o) => !o)}
              aria-label="Buka menu"
              aria-expanded={open}
            >
              {open ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {open && (
          <nav className="xl:hidden pb-4 grid gap-1">
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
