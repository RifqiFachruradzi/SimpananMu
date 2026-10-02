export const CATEGORIES = {
  income: ['Penjualan', 'Gaji', 'Investasi', 'Bonus', 'Lainnya'],
  expense: [
    'Bahan Baku',
    'Gaji Karyawan',
    'Marketing',
    'Operasional',
    'Makanan',
    'Transportasi',
    'Tagihan',
    'Hiburan',
    'Lainnya',
  ],
}

export const CHART_COLORS = ['#d946ef', '#ec4899', '#9333ea', '#f472b6', '#a855f7', '#fb7185', '#c084fc', '#f9a8d4', '#7c3aed']

export const TYPE_LABEL = { income: 'Pendapatan', expense: 'Pengeluaran' }

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export const formatRupiah = (value) => rupiah.format(value || 0)

export const formatCompact = (value) =>
  new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0)

// Dates are stored as 'YYYY-MM-DD'. Parse them as local dates so they never
// shift a day when the browser is in a timezone behind UTC.
export const parseDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const toISODate = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const todayISO = () => toISODate(new Date())

export const formatDate = (iso, options = { day: '2-digit', month: 'short', year: 'numeric' }) =>
  iso ? parseDate(iso).toLocaleDateString('id-ID', options) : '-'

export const monthKey = (iso) => iso.slice(0, 7)

export const formatMonth = (key) =>
  parseDate(`${key}-01`).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })

export const filterTransactions = (transactions, { startDate = '', endDate = '', type = 'all', category = 'all', search = '' } = {}) => {
  const query = search.trim().toLowerCase()
  return transactions.filter((t) => {
    if (startDate && t.date < startDate) return false
    if (endDate && t.date > endDate) return false
    if (type !== 'all' && t.type !== type) return false
    if (category !== 'all' && (t.category || 'Lainnya') !== category) return false
    if (query && !`${t.description} ${t.category || ''} ${t.note || ''}`.toLowerCase().includes(query)) return false
    return true
  })
}

export const summarize = (transactions) => {
  const totals = transactions.reduce(
    (acc, t) => {
      if (t.type === 'income') acc.totalIncome += t.amount
      else acc.totalExpense += t.amount
      return acc
    },
    { totalIncome: 0, totalExpense: 0 },
  )
  return { ...totals, netProfit: totals.totalIncome - totals.totalExpense }
}

export const groupByCategory = (transactions, type) => {
  const map = {}
  transactions
    .filter((t) => t.type === type)
    .forEach((t) => {
      const key = t.category || 'Lainnya'
      map[key] = (map[key] || 0) + t.amount
    })
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

// Income/expense per month for the last `count` months, ending at `endDate`.
export const monthlySeries = (transactions, count = 6, endDate = new Date()) => {
  const months = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1)
    months.push(toISODate(d).slice(0, 7))
  }
  const series = Object.fromEntries(months.map((key) => [key, { month: key, income: 0, expense: 0 }]))
  transactions.forEach((t) => {
    const row = series[monthKey(t.date)]
    if (row) row[t.type] += t.amount
  })
  return months.map((key) => {
    const row = series[key]
    return { ...row, label: formatMonth(key), net: row.income - row.expense }
  })
}

const csvEscape = (value) => {
  const str = String(value ?? '')
  return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export const toCSV = (transactions) => {
  const header = ['tanggal', 'deskripsi', 'kategori', 'jenis', 'nominal', 'catatan']
  const rows = transactions.map((t) =>
    [t.date, t.description, t.category || 'Lainnya', t.type, t.amount, t.note || ''].map(csvEscape).join(','),
  )
  return [header.join(','), ...rows].join('\n')
}

const parseCSVLine = (line) => {
  const cells = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        current += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      cells.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells.map((c) => c.trim())
}

// Parses a CSV produced by toCSV. Returns { transactions, errors }.
export const fromCSV = (text) => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const transactions = []
  const errors = []
  lines.slice(1).forEach((line, index) => {
    const [date, description, category, type, amount, note] = parseCSVLine(line)
    const value = Number(amount)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !description || !['income', 'expense'].includes(type) || !(value > 0)) {
      errors.push(index + 2)
      return
    }
    transactions.push({ date, description, category: category || 'Lainnya', type, amount: value, note: note || '' })
  })
  return { transactions, errors }
}

export const downloadFile = (content, filename, mime = 'text/csv;charset=utf-8') => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
