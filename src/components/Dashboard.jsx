import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { calculateProfitLoss } from '../store/transactionSlice.js'

const Dashboard = () => {
  const dispatch = useDispatch()
  const { transactions, profitLoss } = useSelector(state => state.transactions)

  useEffect(() => {
    dispatch(calculateProfitLoss())
  }, [transactions, dispatch])

  return (
    <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 space-y-16">
      <div className="text-center">
        <h1 className="text-6xl lg:text-7xl font-black bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent mb-6">
          Dashboard Keuangan
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Monitor alur transaksi secara real-time, analisis profit/loss otomatis, dan generate laporan profesional
        </p>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: 'Total Pendapatan', value: profitLoss.totalIncome, color: 'emerald', icon: '📈' },
          { title: 'Total Pengeluaran', value: profitLoss.totalExpense, color: 'rose', icon: '📉' },
          { 
            title: 'Keuntungan Bersih', 
            value: profitLoss.netProfit, 
            color: profitLoss.netProfit >= 0 ? 'emerald' : 'rose',
            icon: profitLoss.netProfit >= 0 ? '🚀' : '⚠️'
          }
        ].map(({ title, value, color, icon }, index) => (
          <div 
            key={title}
            className={`group bg-white/70 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/50 hover:shadow-3xl hover:-translate-y-3 transition-all duration-500 hover:bg-white relative overflow-hidden ${
              index === 2 ? `border-${color}-200` : ''
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity from-white to-transparent" />
            <div className="flex items-start space-x-6">
              <div className={`p-5 bg-gradient-to-br from-${color}-400 to-${color}-600 rounded-3xl shadow-xl group-hover:scale-110 transition-all duration-300 text-2xl`}>
                {icon}
              </div>
              <div className="flex-1 pt-2">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">{title}</p>
                <p className={`text-4xl lg:text-5xl font-black text-${color}-600`}>
                  Rp {value.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-10">
        <h2 className="text-4xl font-bold text-gray-900 mb-10 flex items-center space-x-3">
          <span>📋</span>
          <span>Transaksi Terbaru</span>
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <tr>
                <th className="p-6 text-left font-bold rounded-tl-2xl">Tanggal</th>
                <th className="p-6 text-left font-bold">Deskripsi</th>
                <th className="p-6 text-right font-bold rounded-tr-2xl">Jumlah</th>
                <th className="p-6 text-left font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(-6).map((t) => (
                <tr key={t.id} className="hover:bg-indigo-50/50 transition-all border-b border-gray-100 last:border-b-0">
                  <td className="p-6 font-bold text-lg">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                  <td className="p-6 text-xl font-semibold text-gray-900">{t.description}</td>
                  <td className="p-6 text-right font-black text-3xl">
                    Rp {t.amount.toLocaleString('id-ID')}
                  </td>
                  <td className="p-6">
                    <span className={`px-6 py-3 rounded-full text-lg font-bold shadow-lg ${
                      t.type === 'income'
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-white'
                        : 'bg-gradient-to-r from-rose-400 to-rose-500 text-white'
                    }`}>
                      {t.type === 'income' ? 'PENDAPATAN' : 'PENGELUARAN'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
