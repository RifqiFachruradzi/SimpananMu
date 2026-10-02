import { useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { selectTransactions } from '../store/transactionSlice.js'
import { CATEGORIES, filterTransactions, formatDate, formatRupiah, groupByCategory, summarize, toISODate, todayISO } from '../utils/finance.js'
import { Button, Card, Field, Input, PageHeader, Select } from './ui.jsx'

const ALL_CATEGORIES = [...new Set([...CATEGORIES.income, ...CATEGORIES.expense])]
const emptyFilters = { startDate: '', endDate: '', type: 'all', category: 'all' }

const firstOfMonth = () => `${todayISO().slice(0, 7)}-01`

const PRESETS = [
  { label: 'Bulan ini', range: () => ({ startDate: firstOfMonth(), endDate: todayISO() }) },
  {
    label: 'Bulan lalu',
    range: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { startDate: toISODate(start), endDate: toISODate(end) }
    },
  },
  { label: 'Tahun ini', range: () => ({ startDate: `${todayISO().slice(0, 4)}-01-01`, endDate: todayISO() }) },
  { label: 'Semua', range: () => ({ startDate: '', endDate: '' }) },
]

const CategoryTable = ({ title, rows, total, tone }) => (
  <div>
    <h3 className={`text-lg font-bold mb-2 ${tone}`}>{title}</h3>
    {rows.length ? (
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-outline-variant/30">
              <td className="py-2 text-on-surface">{r.name}</td>
              <td className="py-2 text-right text-on-surface-variant">{total ? Math.round((r.value / total) * 100) : 0}%</td>
              <td className="py-2 text-right font-semibold text-on-surface">{formatRupiah(r.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p className="text-sm text-on-surface-variant">Tidak ada data.</p>
    )}
  </div>
)

const ReportGenerator = () => {
  const [filters, setFilters] = useState(emptyFilters)
  const [generating, setGenerating] = useState(false)
  const transactions = useSelector(selectTransactions)
  const reportRef = useRef(null)

  const filtered = useMemo(
    () => filterTransactions(transactions, filters).sort((a, b) => a.date.localeCompare(b.date)),
    [transactions, filters],
  )
  const { totalIncome, totalExpense, netProfit } = summarize(filtered)
  const incomeByCategory = groupByCategory(filtered, 'income')
  const expenseByCategory = groupByCategory(filtered, 'expense')

  const set = (field) => (e) => {
    const value = e.target.value
    setFilters((f) => ({ ...f, [field]: value, ...(field === 'type' ? { category: 'all' } : {}) }))
  }

  const periodStart = filters.startDate || filtered[0]?.date
  const periodEnd = filters.endDate || filtered[filtered.length - 1]?.date
  const periodLabel = periodStart || periodEnd ? `${formatDate(periodStart, { day: 'numeric', month: 'long', year: 'numeric' })} – ${formatDate(periodEnd, { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Semua periode'

  const generatePDF = async () => {
    setGenerating(true)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      const element = reportRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1024,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgHeight = (canvas.height * pdfWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
      heightLeft -= pdfHeight
      while (heightLeft > 0) {
        position -= pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      pdf.save(`Laporan_SimpananMu_${todayISO()}.pdf`)
    } catch (err) {
      console.error(err)
      window.alert('Gagal membuat PDF. Silakan coba lagi.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-content mx-auto px-5 md:px-8 pt-4 md:pt-6 space-y-6">
      <div className="print:hidden space-y-6">
        <PageHeader
          title="Laporan"
          subtitle="Buat laporan laba/rugi dengan filter periode, jenis, dan kategori. Unduh sebagai PDF atau cetak langsung."
        />

        <Card className="p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(({ label, range }) => (
              <button
                key={label}
                onClick={() => setFilters((f) => ({ ...f, ...range() }))}
                className="chip !py-1.5"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="📅 Tanggal mulai">
              <Input type="date" value={filters.startDate} onChange={set('startDate')} />
            </Field>
            <Field label="📅 Tanggal selesai">
              <Input type="date" value={filters.endDate} onChange={set('endDate')} />
            </Field>
            <Field label="🔍 Jenis">
              <Select value={filters.type} onChange={set('type')}>
                <option value="all">Semua transaksi</option>
                <option value="income">Hanya pendapatan</option>
                <option value="expense">Hanya pengeluaran</option>
              </Select>
            </Field>
            <Field label="🏷️ Kategori">
              <Select value={filters.category} onChange={set('category')}>
                <option value="all">Semua kategori</option>
                {(filters.type === 'all' ? ALL_CATEGORIES : CATEGORIES[filters.type]).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-3 pt-2 border-t border-outline-variant/30">
            <Button variant="success" onClick={generatePDF} disabled={generating || !filtered.length}>
              {generating ? '⏳ Membuat PDF…' : '⬇️ Download PDF'}
            </Button>
            <Button variant="secondary" onClick={() => window.print()} disabled={!filtered.length}>
              🖨️ Cetak
            </Button>
            <Button variant="secondary" onClick={() => setFilters(emptyFilters)}>
              🔄 Reset filter
            </Button>
          </div>
        </Card>
      </div>

      {/* Report preview — also what gets captured into the PDF / printed */}
      <div className="overflow-x-auto rounded-card shadow-2xl print:shadow-none print:overflow-visible">
        <div ref={reportRef} className="bg-white min-w-[720px] p-10 space-y-10 print:p-0">
          <div className="flex items-start justify-between border-b-4 border-primary-container pb-6">
            <div>
              <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">LAPORAN KEUANGAN</h2>
              <p className="text-lg text-on-surface-variant mt-1">Periode: {periodLabel}</p>
              <p className="text-sm text-on-surface-variant mt-1">
                {filters.type !== 'all' && `Jenis: ${filters.type === 'income' ? 'Pendapatan' : 'Pengeluaran'} · `}
                {filters.category !== 'all' && `Kategori: ${filters.category} · `}
                {filtered.length} transaksi
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-primary">💰 SimpananMu</p>
              <p className="text-sm text-on-surface-variant">Dicetak {new Date().toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="p-6 rounded-tile bg-mint-soft/60 border-2 border-mint/40">
              <p className="text-sm font-bold text-mint-ink uppercase tracking-wider">Total Pendapatan</p>
              <p className="mt-2 text-2xl font-extrabold text-mint-ink">{formatRupiah(totalIncome)}</p>
            </div>
            <div className="p-6 rounded-tile bg-raspberry-soft/60 border-2 border-raspberry/30">
              <p className="text-sm font-bold text-raspberry-ink uppercase tracking-wider">Total Pengeluaran</p>
              <p className="mt-2 text-2xl font-extrabold text-raspberry-ink">{formatRupiah(totalExpense)}</p>
            </div>
            <div className={`p-6 rounded-tile border-2 ${netProfit >= 0 ? 'bg-mint-soft/60 border-mint/40' : 'bg-raspberry-soft/60 border-raspberry/30'}`}>
              <p className="text-sm font-bold text-on-surface uppercase tracking-wider">{netProfit >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}</p>
              <p className={`mt-2 text-2xl font-extrabold ${netProfit >= 0 ? 'text-mint-ink' : 'text-raspberry-ink'}`}>{formatRupiah(netProfit)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10">
            <CategoryTable title="Pendapatan per Kategori" rows={incomeByCategory} total={totalIncome} tone="text-mint-ink" />
            <CategoryTable title="Pengeluaran per Kategori" rows={expenseByCategory} total={totalExpense} tone="text-raspberry-ink" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Rincian Transaksi</h3>
            <table className="w-full text-sm border border-outline-variant/30">
              <thead className="table-head">
                <tr>
                  <th className="p-3 text-left">Tanggal</th>
                  <th className="p-3 text-left">Deskripsi</th>
                  <th className="p-3 text-left">Kategori</th>
                  <th className="p-3 text-right">Pendapatan</th>
                  <th className="p-3 text-right">Pengeluaran</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.id} className={`border-b border-outline-variant/30 ${i % 2 ? 'bg-surface-container-low' : ''}`}>
                    <td className="p-3 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="p-3">{t.description}</td>
                    <td className="p-3 text-on-surface-variant">{t.category || 'Lainnya'}</td>
                    <td className="p-3 text-right text-mint-ink">{t.type === 'income' ? formatRupiah(t.amount) : ''}</td>
                    <td className="p-3 text-right text-raspberry-ink">{t.type === 'expense' ? formatRupiah(t.amount) : ''}</td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-on-surface-variant">
                      Tidak ada transaksi pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-surface-container font-bold">
                <tr>
                  <td colSpan={3} className="p-3 text-right">
                    Total
                  </td>
                  <td className="p-3 text-right text-mint-ink">{formatRupiah(totalIncome)}</td>
                  <td className="p-3 text-right text-raspberry-ink">{formatRupiah(totalExpense)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="pt-6 border-t border-outline-variant/30 text-center text-sm text-on-surface-variant">
            SimpananMu — Sistem Pencatatan & Laporan Keuangan
          </p>
        </div>
      </div>
    </div>
  )
}

export default ReportGenerator
