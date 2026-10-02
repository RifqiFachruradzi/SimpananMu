import { useMemo, useRef, useState } from 'react'
import { Download, Plus, Search, SlidersHorizontal, Trash2, Upload, X } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import {
  clearTransactions,
  deleteTransaction,
  importTransactions,
  resetTransactions,
  selectTransactions,
} from '../store/transactionSlice.js'
import { CATEGORIES, downloadFile, filterTransactions, formatCompact, formatDate, formatRupiah, fromCSV, summarize, toCSV, todayISO } from '../utils/finance.js'
import TransactionForm from './TransactionForm.jsx'
import TransactionItem from './TransactionItem.jsx'
import { Button, Card, EmptyState, Field, IconButton, Input, PageHeader, Segmented, Select } from './ui.jsx'

const PAGE_SIZE = 20
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
  const [showFilters, setShowFilters] = useState(false)
  const fileInput = useRef(null)

  const filtered = useMemo(
    // Newest-added first among ties (Array.prototype.sort is stable).
    () => filterTransactions([...transactions].reverse(), filters).sort(SORTERS[sort]),
    [transactions, filters, sort],
  )
  const totals = useMemo(() => summarize(filtered), [filtered])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const isFiltered = JSON.stringify(filters) !== JSON.stringify(emptyFilters)

  const setFilter = (field) => (e) => {
    const value = e?.target ? e.target.value : e
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

  // Group the visible page by date for a ledger-style list.
  const groups = []
  visible.forEach((t) => {
    const last = groups[groups.length - 1]
    if (last && last.date === t.date) last.items.push(t)
    else groups.push({ date: t.date, items: [t] })
  })

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-8 pt-4 md:pt-6 space-y-5">
      <PageHeader
        title="Transaksi"
        subtitle="Catat, cari, ubah, dan ekspor riwayat keuanganmu."
        actions={
          <>
            <Button onClick={() => setEditing({})}>
              <Plus size={18} /> Tambah
            </Button>
            <IconButton label="Ekspor CSV" onClick={handleExport} disabled={!filtered.length} className="!w-11 !h-11 disabled:opacity-50">
              <Download size={18} />
            </IconButton>
            <IconButton label="Impor CSV" onClick={() => fileInput.current?.click()} className="!w-11 !h-11">
              <Upload size={18} />
            </IconButton>
            <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
          </>
        }
      />

      {message && (
        <div className="flex items-start justify-between gap-3 p-4 rounded-card glass-strong text-body-md text-on-surface">
          <span>{message}</span>
          <button onClick={() => setMessage('')} aria-label="Tutup pesan" className="text-on-surface-variant">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          ['Masuk', totals.totalIncome, 'text-tertiary', 'bg-tertiary-fixed/50'],
          ['Keluar', totals.totalExpense, 'text-primary', 'bg-primary-fixed/50'],
          ['Selisih', totals.netProfit, totals.netProfit >= 0 ? 'text-mint-ink' : 'text-raspberry-ink', 'bg-white'],
        ].map(([label, value, color, bg]) => (
          <div key={label} className={`rounded-card p-3 border border-primary-container/10 shadow-level-1 ${bg}`}>
            <p className="text-label-sm uppercase text-on-surface-variant">{label}</p>
            <p className={`text-label-lg tnum truncate ${color}`} title={formatRupiah(value)}>
              {value < 0 ? '-' : ''}Rp {formatCompact(Math.abs(value))}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <Input type="search" className="!rounded-full pl-11" placeholder="Cari transaksi…" value={filters.search} onChange={setFilter('search')} aria-label="Cari transaksi" />
          </label>
          <IconButton
            label="Filter lanjutan"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className={`!w-11 !h-11 ${showFilters ? '!bg-primary-container !text-on-primary-container' : ''}`}
          >
            <SlidersHorizontal size={18} />
          </IconButton>
        </div>
        <Segmented
          value={filters.type}
          onChange={setFilter('type')}
          options={[
            { value: 'all', label: 'Semua' },
            { value: 'expense', label: 'Keluar' },
            { value: 'income', label: 'Masuk' },
          ]}
        />
        {showFilters && (
          <Card className="p-4 grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Field label="Kategori">
                <Select value={filters.category} onChange={setFilter('category')}>
                  <option value="all">Semua kategori</option>
                  {(filters.type === 'all' ? ALL_CATEGORIES : CATEGORIES[filters.type]).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Field label="Urutkan">
                <Select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="date-desc">Terbaru</option>
                  <option value="date-asc">Terlama</option>
                  <option value="amount-desc">Nominal terbesar</option>
                  <option value="amount-asc">Nominal terkecil</option>
                </Select>
              </Field>
            </div>
            <Field label="Dari tanggal">
              <Input type="date" value={filters.startDate} onChange={setFilter('startDate')} />
            </Field>
            <Field label="Sampai tanggal">
              <Input type="date" value={filters.endDate} onChange={setFilter('endDate')} />
            </Field>
          </Card>
        )}
        <div className="flex items-center justify-between px-1 text-label-md text-on-surface-variant">
          <span>{filtered.length} transaksi</span>
          {isFiltered && (
            <button className="text-primary hover:underline" onClick={() => setFilters(emptyFilters)}>
              Reset filter
            </button>
          )}
        </div>
      </div>

      <section className="bg-white rounded-card-lg px-5 py-2 border border-outline-variant/30 shadow-level-1">
        {groups.length ? (
          groups.map((g) => (
            <div key={g.date} className="py-2 first:pt-3">
              <p className="text-label-sm uppercase text-on-surface-variant pb-1">{formatDate(g.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <ul className="divide-y divide-outline-variant/20">
                {g.items.map((t) => (
                  <TransactionItem
                    key={t.id}
                    t={t}
                    showNote
                    onClick={() => setEditing(t)}
                    trailing={
                      <button
                        onClick={() => handleDelete(t)}
                        className="icon-disc w-9 h-9 text-on-surface-variant hover:bg-raspberry-soft hover:text-raspberry-ink transition-colors"
                        aria-label={`Hapus ${t.description}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    }
                  />
                ))}
              </ul>
            </div>
          ))
        ) : (
          <EmptyState message={transactions.length ? 'Tidak ada transaksi yang cocok dengan filter.' : 'Belum ada transaksi.'}>
            {!transactions.length && (
              <Button onClick={() => setEditing({})}>
                <Plus size={18} /> Tambah transaksi
              </Button>
            )}
          </EmptyState>
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-between py-3 border-t border-outline-variant/20 text-label-md text-on-surface-variant">
            <span>
              Hal. {currentPage} / {pageCount}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                ← Sebelumnya
              </Button>
              <Button variant="secondary" size="sm" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                Berikutnya →
              </Button>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="secondary" size="sm" onClick={handleReset}>
          Muat data contoh
        </Button>
        <Button variant="danger" size="sm" onClick={handleClear} disabled={!transactions.length}>
          <Trash2 size={14} /> Hapus semua
        </Button>
      </div>

      {editing && <TransactionForm transaction={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </div>
  )
}

export default TransactionList
