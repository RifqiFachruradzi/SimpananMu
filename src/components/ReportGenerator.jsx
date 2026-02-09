import { useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const ReportGenerator = () => {
  const [filters, setFilters] = useState({ startDate: '', endDate: '', type: 'all' })
  const transactions = useSelector(state => state.transactions.transactions)
  const reportRef = useRef()

  const filteredTransactions = transactions.filter(t => {
    const date = new Date(t.date)
    const start = filters.startDate ? new Date(filters.startDate) : null
    const end = filters.endDate ? new Date(filters.endDate) : null
    
    if (start && date < start) return false
    if (end && date > end) return false
    if (filters.type !== 'all' && t.type !== filters.type) return false
    return true
  })

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
    
  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const netProfit = totalIncome - totalExpense

  const generatePDF = async () => {
    const element = reportRef.current
    const canvas = await html2canvas(element, { 
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: element.scrollWidth
    })
    
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pdfHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight
    }
    
    pdf.save(`Laporan_FineReport_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 space-y-12">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 text-white p-16 rounded-4xl shadow-2xl text-center">
        <h1 className="text-6xl font-black mb-6">📄 Generator Laporan PDF</h1>
        <p className="text-2xl opacity-95 max-w-4xl mx-auto leading-relaxed">
          Buat laporan keuangan profesional dengan filter tanggal dan jenis transaksi, siap dicetak PDF
        </p>
      </div>

      {/* Filter Panel */}
      <div className="bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/60">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end">
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-4">📅 Tanggal Mulai</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="w-full p-5 text-lg border-2 border-gray-200 rounded-3xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all shadow-lg hover:shadow-xl"
            />
          </div>
          
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-4">📅 Tanggal Selesai</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="w-full p-5 text-lg border-2 border-gray-200 rounded-3xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all shadow-lg hover:shadow-xl"
            />
          </div>
          
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-4">🔍 Filter Jenis</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              className="w-full p-5 text-lg border-2 border-gray-200 rounded-3xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all shadow-lg hover:shadow-xl appearance-none bg-gradient-to-r from-white to-gray-50"
            >
              <option value="all">Semua Transaksi</option>
              <option value="income">💰 Hanya Pendapatan</option>
              <option value="expense">💸 Hanya Pengeluaran</option>
            </select>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6 mt-12 pt-12 border-t-2 border-gray-100">
          <button
            onClick={generatePDF}
            className="flex-1 lg:flex-none bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-green-700 text-white py-8 px-12 rounded-3xl text-2xl font-black shadow-2xl hover:shadow-3xl hover:-translate-y-2 transition-all duration-300 flex items-center justify-center space-x-4 text-center"
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download PDF Laporan</span>
          </button>
          
          <button
            onClick={() => setFilters({ startDate: '', endDate: '', type: 'all' })}
            className="px-12 py-8 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 rounded-3xl text-xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-2 border-gray-300"
          >
            🔄 Reset Semua Filter
          </button>
        </div>
      </div>

      {/* Report Preview */}
      <div ref={reportRef} className="print-only">
        <div className="bg-white shadow-2xl rounded-4xl border-8 border-gray-100 p-20 print:p-24 print:shadow-none print:border-none">
          <div className="text-center mb-24 print:mb-32">
            <div className="bg-gradient-to-r from-indigo-700 to-purple-700 inline-block px-20 py-10 rounded-4xl mb-8 shadow-2xl print:shadow-none">
              <h2 className="text-6xl font-black text-white tracking-tight">LAPORAN KEUANGAN</h2>
              <p className="text-2xl font-semibold mt-4 opacity-95">FineReport Professional</p>
            </div>
            <div className="space-y-2">
              <p className="text-3xl text-gray-800 font-bold">
                Periode: {filters.startDate || '01 Februari 2026'} - {filters.endDate || '09 Februari 2026'}
              </p>
              <p className="text-2xl text-gray-600">Total {filteredTransactions.length} transaksi tercatat</p>
            </div>
          </div>

          {/* Summary Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-24 print:mb-32">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-12 rounded-4xl border-4 border-emerald-200 text-center shadow-xl hover:shadow-2xl transition-all">
              <h3 className="text-3xl font-bold text-emerald-800 mb-6 uppercase tracking-wider">Total Pendapatan</h3>
              <p className="text-6xl lg:text-7xl font-black text-emerald-600">Rp {totalIncome.toLocaleString('id-ID')}</p>
            </div>
            
            <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-12 rounded-4xl border-4 border-rose-200 text-center shadow-xl hover:shadow-2xl transition-all">
              <h3 className="text-3xl font-bold text-rose-800 mb-6 uppercase tracking-wider">Total Pengeluaran</h3>
              <p className="text-6xl lg:text-7xl font-black text-rose-600">Rp {totalExpense.toLocaleString('id-ID')}</p>
            </div>
            
            <div className={`p-12 rounded-4xl border-4 text-center shadow-xl hover:shadow-2xl transition-all ${
              netProfit >= 0 
                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200' 
                : 'bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200'
            }`}>
              <h3 className="text-3xl font-bold text-gray-800 mb-6 uppercase tracking-wider">Keuntungan Bersih</h3>
              <p className={`text-6xl lg:text-7xl font-black ${
                netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                Rp {netProfit.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="overflow-hidden rounded-3xl border-4 border-gray-200 shadow-2xl">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                <tr>
                  <th className="p-8 text-left font-black text-2xl rounded-tl-3xl">Tanggal</th>
                  <th className="p-8 text-left font-black text-2xl">Deskripsi Transaksi</th>
                  <th className="p-8 text-right font-black text-2xl rounded-tr-3xl">Nominal</th>
                  <th className="p-8 text-left font-black text-2xl">Jenis</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction, index) => (
                  <tr key={transaction.id} className={`transition-all hover:bg-gray-50/50 border-b-4 border-gray-100 last:border-none ${index % 2 === 0 ? 'bg-gradient-to-r from-gray-50/30 to-transparent' : ''}`}>
                    <td className="p-8 font-black text-2xl text-gray-900">{new Date(transaction.date).toLocaleDateString('id-ID')}</td>
                    <td className="p-8 text-2xl font-bold text-gray-900 max-w-2xl">{transaction.description}</td>
                    <td className="p-8 text-right font-black text-4xl text-gray-900">
                      Rp {transaction.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="p-8">
                      <span className={`px-8 py-4 rounded-2xl text-xl font-black shadow-2xl text-white ${
                        transaction.type === 'income'
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                          : 'bg-gradient-to-r from-rose-500 to-rose-600'
                      }`}>
                        {transaction.type === 'income' ? 'PENDAPATAN' : 'PENGELUARAN'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-24 pt-20 border-t-8 border-gray-300 text-center text-2xl text-gray-600 print:pt-32">
            <p>Dicetak pada: <span className="font-bold text-gray-900">{new Date().toLocaleString('id-ID')}</span></p>
            <p className="mt-8 text-3xl font-bold text-indigo-800 tracking-wide">
              FineReport Clone - Sistem Laporan Keuangan Profesional
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportGenerator
