import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'

const Header = () => {
  const { profitLoss } = useSelector(state => state.transactions)
  
  return (
    <header className="bg-white/90 backdrop-blur-xl shadow-2xl sticky top-0 z-50 border-b-4 border-indigo-500/30 supports-[backdrop-filter:blur()]:bg-white/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <Link 
            to="/" 
            className="text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent hover:scale-105 transition-all duration-300"
          >
            💰 SIMPANAN-MU
          </Link>
          
          <div className="flex items-center space-x-8">
            <div className="text-right hidden lg:block">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Keuntungan Bersih</p>
              <p className={`text-3xl font-black ${
                profitLoss.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                Rp {profitLoss.netProfit.toLocaleString('id-ID')}
              </p>
            </div>
            
            <nav className="flex space-x-2">
              {[
                { to: '/', label: '📊 Dashboard' },
                { to: '/transactions', label: '💳 Transaksi' },
                { to: '/report', label: '📄 Laporan' }
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="px-6 py-3 text-lg font-semibold text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
