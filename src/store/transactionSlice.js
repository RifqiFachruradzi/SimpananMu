import { createSlice } from '@reduxjs/toolkit'
import { toISODate } from '../utils/finance.js'

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

// Sample data spread over the last three months so the charts have something
// to show on first launch. Only used when nothing is saved in localStorage.
const buildSeed = () => {
  const now = new Date()
  const day = (monthsAgo, d) => {
    const lastDay = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0).getDate()
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.min(d, lastDay))
    return toISODate(date > now ? now : date)
  }
  const rows = []
  ;[2, 1, 0].forEach((m) => {
    rows.push(
      { date: day(m, 1), description: 'Penjualan Produk A', amount: 2500000 + m * 150000, type: 'income', category: 'Penjualan' },
      { date: day(m, 2), description: 'Pembelian Bahan Baku', amount: 800000 + m * 50000, type: 'expense', category: 'Bahan Baku' },
      { date: day(m, 3), description: 'Penjualan Produk B', amount: 1800000 - m * 100000, type: 'income', category: 'Penjualan' },
      { date: day(m, 4), description: 'Gaji Karyawan', amount: 1200000, type: 'expense', category: 'Gaji Karyawan' },
      { date: day(m, 5), description: 'Biaya Marketing', amount: 500000, type: 'expense', category: 'Marketing' },
      { date: day(m, 6), description: 'Penjualan Online', amount: 3200000 - m * 200000, type: 'income', category: 'Penjualan' },
      { date: day(m, 10), description: 'Listrik & Internet', amount: 450000, type: 'expense', category: 'Tagihan' },
      { date: day(m, 15), description: 'Bensin & Ongkir', amount: 300000 + m * 25000, type: 'expense', category: 'Transportasi' },
    )
  })
  return rows.map((t, i) => ({ ...t, id: `seed-${i + 1}`, note: '' }))
}

export const defaultTransactionState = () => ({ transactions: buildSeed() })

const transactionSlice = createSlice({
  name: 'transactions',
  initialState: defaultTransactionState,
  reducers: {
    addTransaction: {
      reducer: (state, action) => {
        state.transactions.push(action.payload)
      },
      prepare: (transaction) => ({ payload: { ...transaction, id: newId() } }),
    },
    updateTransaction: (state, action) => {
      const index = state.transactions.findIndex((t) => t.id === action.payload.id)
      if (index !== -1) state.transactions[index] = { ...state.transactions[index], ...action.payload }
    },
    deleteTransaction: (state, action) => {
      state.transactions = state.transactions.filter((t) => t.id !== action.payload)
    },
    importTransactions: {
      reducer: (state, action) => {
        state.transactions.push(...action.payload)
      },
      prepare: (transactions) => ({ payload: transactions.map((t) => ({ ...t, id: newId() })) }),
    },
    resetTransactions: () => defaultTransactionState(),
    clearTransactions: (state) => {
      state.transactions = []
    },
  },
})

export const selectTransactions = (state) => state.transactions.transactions

export const {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions,
  resetTransactions,
  clearTransactions,
} = transactionSlice.actions
export default transactionSlice.reducer
