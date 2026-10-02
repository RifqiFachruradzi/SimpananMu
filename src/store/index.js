import { configureStore } from '@reduxjs/toolkit'
import transactionReducer from './transactionSlice.js'
import planningReducer from './planningSlice.js'

const STORAGE_KEY = 'simpananmu:v1'

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return undefined
    const saved = JSON.parse(raw)
    if (!Array.isArray(saved?.transactions?.transactions)) return undefined
    return saved
  } catch {
    return undefined
  }
}

export const store = configureStore({
  reducer: {
    transactions: transactionReducer,
    planning: planningReducer,
  },
  preloadedState: loadState(),
})

let lastSaved
store.subscribe(() => {
  const state = store.getState()
  if (state === lastSaved) return
  lastSaved = state
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage may be full or blocked (private mode); the app keeps working in memory.
  }
})
