import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  transactions: [
    { id: 1, date: '2026-02-01', description: 'Penjualan Produk A', amount: 2500000, type: 'income' },
    { id: 2, date: '2026-02-02', description: 'Pembelian Bahan Baku', amount: 800000, type: 'expense' },
    { id: 3, date: '2026-02-03', description: 'Penjualan Produk B', amount: 1800000, type: 'income' },
    { id: 4, date: '2026-02-04', description: 'Gaji Karyawan', amount: 1200000, type: 'expense' },
    { id: 5, date: '2026-02-05', description: 'Biaya Marketing', amount: 500000, type: 'expense' },
    { id: 6, date: '2026-02-06', description: 'Penjualan Online', amount: 3200000, type: 'income' },
  ],
  filters: { startDate: '', endDate: '', type: 'all' },
  profitLoss: { totalIncome: 0, totalExpense: 0, netProfit: 0 }
}

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    addTransaction: (state, action) => {
      state.transactions.push({ ...action.payload, id: Date.now() })
    },
    setFilters: (state, action) => {
      state.filters = action.payload
    },
    calculateProfitLoss: (state) => {
      const filtered = state.transactions.filter(t => {
        const date = new Date(t.date)
        const start = state.filters.startDate ? new Date(state.filters.startDate) : null
        const end = state.filters.endDate ? new Date(state.filters.endDate) : null
        
        if (start && date < start) return false
        if (end && date > end) return false
        if (state.filters.type !== 'all' && t.type !== state.filters.type) return false
        return true
      })

      state.profitLoss = filtered.reduce((acc, t) => {
        if (t.type === 'income') acc.totalIncome += t.amount
        else acc.totalExpense += t.amount
        acc.netProfit = acc.totalIncome - acc.totalExpense
        return acc
      }, { totalIncome: 0, totalExpense: 0, netProfit: 0 })
    }
  }
})

export const { addTransaction, setFilters, calculateProfitLoss } = transactionSlice.actions
export default transactionSlice.reducer
