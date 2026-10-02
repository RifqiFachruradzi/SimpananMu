import { useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  clearTransactions,
  deleteTransaction,
  importTransactions,
  resetTransactions,
  selectTransactions,
} from '../store/transactionSlice.js'
import { CATEGORIES, downloadFile, filterTransactions, formatDate, formatRupiah, fromCSV, summarize, toCSV, todayISO } from '../utils/finance.js'
import TransactionForm from './TransactionForm.jsx'
import { Button, Card, EmptyState, Input, PageHeader, Select, TypeBadge } from './ui.jsx'

const PAGE_SIZE = 15
const ALL_CATEGORIES = [...new Set([...CATEGORIES.income, ...CATEGORIES.expense])]
const emptyFilters = { search: '', type: 'all', category: 'all', startDate: '', endDate: '' }

const SORTERS = {
  'date-desc': (a, b) => b.date.localeCompare(a.date),
  'date-asc': (a, b) => a.date.localeCompare(b.date),
  'amount-desc': (a, b) => b.amount - a.amount,
  'amount-asc': (a, b) => a.amount - b.amount,
}

const TransactionList = () => {
  const dispatch = useDispatch()
  const transactions = useSelector(selectTransactions)
  const [filters, setFilters] = useState(emptyFilters)
  const [sort, setSort] = useState('date-desc')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null) // null = closed, {} = new, transaction = edit
  const [message, setMessage] = useState('')
  const fileInput = useRef(null)

  const filtered = useMemo(
    () => filterTransactions(transactions, filters).sort(SORTERS[sort]),
    [transactions, filters, sort],
  )
  const totals = useMemo(() => summarize(filtered), [filtered])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(emptyFilters)

  const setFilter = (field) => (e) => {
    const value = e.target.value
    setFilters((f) => ({ ...f, [field]: value, ...(field === 'type' ? { category: 'all' } : {}) }))
    setPage(1)
  }

  const handleDelete = (t) => {
    if (window.confirm(`Hapus transaksi "${t.description}"?`)) dispatch(deleteTransaction(t.id))
  }

  const handleExport = () => {
    downloadFile('\uFEFF' + toCSV(filtered), `transaksi_simpananmu_${todayISO()}.csv`)
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const { transactions: rows, errors } = fromCSV((await file.text()).replace(/^\uFEFF/, ''))
    if (rows.length) dispatch(importTransactions(rows))
    setMessage(
      `${rows.length} transaksi berhasil diimpor.` + (errors.length ? ` ${errors.length} baris dilewati (baris ${errors.slice(0, 5).join(', ')}${errors.length > 5 ? ', …' : ''}).` : ''),
    )
  }

  const handleReset = () => {
    if (window.confirm('Kembalikan data contoh? Semua transaksi saat ini akan diganti.')) dispatch(resetTransactions())
  }

  const handleClear = () => {
    if (window.confirm('Hapus SEMUA transaksi? Tindakan ini tidak dapat dibatalkan.')) dispatch(clearTransactions())
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        icon="💳"
        title="Daftar Transaksi"
        subtitle="Catat, cari, ubah, dan ekspor seluruh riwayat transaksi keuangan Anda."
        actions={
          <>
            <Button onClick={() => setEditing({})}>➕ Tambah</Button>
            <Button variant="secondary" onClick={handleExport} disabled={!filtered.length}>
              ⬇️ Ekspor CSV
            </Button>
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>
              ⬆️ Impor CSV
            </Button>
            <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
          </>
        }
      />

      {message && (
        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl glass-strong text-fuchsia-900">
          <span>{message}</span>
          <button onClick={() => setMessage('')} aria-label="Tutup pesan">
            ✕
          </button>
        </div>
      )}

      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <Input className="lg:col-span-2" type="search" placeholder="🔍 Cari deskripsi, kategori, catatan…" value={filters.search} onChange={setFilter('search')} />
          <Select value={filters.type} onChange={setFilter('type')} aria-label="Jenis">
            <option value="all">Semua jenis</option>
            <option value="income">Pendapatan</option>
            <option value="expense">Pengeluaran</option>
          </Select>
          <Select value={filters.category} onChange={setFilter('category')} aria-label="Kategori">
            <option value="all">Semua kategori</option>
            {(filters.type === 'all' ? ALL_CATEGORIES : CATEGORIES[filters.type]).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Input type="date" value={filters.startDate} onChange={setFilter('startDate')} aria-label="Dari tanggal" />
          <Input type="date" value={filters.endDate} onChange={setFilter('endDate')} aria-label="Sampai tanggal" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-gray-600">
            <span>
              <b className="text-gray-900">{filtered.length}</b> transaksi
            </span>
            <span>
              Masuk <b className="text-emerald-600">{formatRupiah(totals.totalIncome)}</b>
            </span>
            <span>
              Keluar <b className="text-rose-600">{formatRupiah(totals.totalExpense)}</b>
            </span>
            <span>
              Selisih <b className={totals.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatRupiah(totals.netProfit)}</b>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isFiltered && (
              <button className="text-fuchsia-600 font-semibold hover:underline" onClick={() => setFilters(emptyFilters)}>
                Reset filter
              </button>
            )}
            <Select className="!w-auto !py-1.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Urutkan">
              <option value="date-desc">Terbaru</option>
              <option value="date-asc">Terlama</option>
              <option value="amount-desc">Nominal terbesar</option>
              <option value="amount-asc">Nominal terkecil</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {visible.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="table-head text-sm uppercase tracking-wider">
                <tr>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Deskripsi</th>
                  <th className="p-4 hidden md:table-cell">Kategori</th>
                  <th className="p-4 text-right">Nominal</th>
                  <th className="p-4 hidden sm:table-cell">Jenis</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t, index) => (
                  <tr key={t.id} className={`border-b border-fuchsia-50 last:border-none hover:bg-fuchsia-50/70 ${index % 2 === 0 ? 'bg-white/40' : ''}`}>
                    <td className="p-4 whitespace-nowrap font-semibold text-gray-700">{formatDate(t.date)}</td>
                    <td className="p-4">
                      <p className="font-semibold text-gray-900">{t.description}</p>
                      {t.note && <p className="text-sm text-gray-500">{t.note}</p>}
                      <p className="text-sm text-gray-500 md:hidden">{t.category || 'Lainnya'}</p>
                    </td>
                    <td className="p-4 hidden md:table-cell text-gray-700">{t.category || 'Lainnya'}</td>
                    <td className={`p-4 text-right font-black whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'income' ? '+' : '−'} {formatRupiah(t.amount)}
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <TypeBadge type={t.type} />
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button onClick={() => setEditing(t)} className="p-2 rounded-xl hover:bg-fuchsia-100" aria-label={`Ubah ${t.description}`}>
                        ✏️
                      </button>
                      <button onClick={() => handleDelete(t)} className="p-2 rounded-xl hover:bg-rose-100" aria-label={`Hapus ${t.description}`}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message={transactions.length ? 'Tidak ada transaksi yang cocok dengan filter.' : 'Belum ada transaksi.'}>
            {!transactions.length && <Button onClick={() => setEditing({})}>➕ Tambah transaksi</Button>}
          </EmptyState>
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100 text-sm">
            <span className="text-gray-600">
              Halaman {currentPage} dari {pageCount}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" className="!py-1.5" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                ← Sebelumnya
              </Button>
              <Button variant="secondary" className="!py-1.5" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                Berikutnya →
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" onClick={handleReset}>
          🔄 Muat data contoh
        </Button>
        <Button variant="danger" onClick={handleClear} disabled={!transactions.length}>
          🗑️ Hapus semua
        </Button>
      </div>

      {editing && <TransactionForm transaction={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </div>
  )
}

export default TransactionList
