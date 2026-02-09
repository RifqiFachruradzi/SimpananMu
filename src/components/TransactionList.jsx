import { useSelector } from 'react-redux'

const TransactionList = () => {
  const transactions = useSelector(state => state.transactions.transactions)

  return (
    <div className="max-w-6xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black text-gray-900 mb-6">📋 Daftar Lengkap Transaksi</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Semua riwayat transaksi keuangan Anda dalam tampilan yang mudah dibaca
        </p>
      </div>
      
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
              <tr>
                <th className="p-6 text-left font-black uppercase tracking-wider">ID</th>
                <th className="p-6 text-left font-black uppercase tracking-wider">Tanggal</th>
                <th className="p-6 text-left font-black uppercase tracking-wider">Deskripsi</th>
                <th className="p-6 text-right font-black uppercase tracking-wider">Nominal</th>
                <th className="p-6 text-left font-black uppercase tracking-wider">Kategori</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, index) => (
                <tr 
                  key={t.id} 
                  className={`transition-all hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 border-b border-gray-100 last:border-none ${
                    index % 2 === 0 ? 'bg-gray-50/50' : ''
                  }`}
                >
                  <td className="p-6 font-mono text-sm font-bold text-gray-600">#{t.id}</td>
                  <td className="p-6 font-bold text-lg">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                  <td className="p-6 font-semibold text-xl text-gray-900 max-w-md">{t.description}</td>
                  <td className="p-6 text-right font-black text-3xl text-gray-900">
                    Rp {t.amount.toLocaleString('id-ID')}
                  </td>
                  <td className="p-6">
                    <span className={`px-6 py-3 rounded-full text-lg font-bold shadow-md text-white ${
                      t.type === 'income'
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                        : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700'
                    }`}>
                      {t.type.toUpperCase()}
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

export default TransactionList
