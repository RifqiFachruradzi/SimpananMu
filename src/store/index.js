import { configureStore } from '@reduxjs/toolkit'
import transactionReducer from './transactionSlice.js'

export const store = configureStore({
  reducer: {
    transactions: transactionReducer,
  },
})
