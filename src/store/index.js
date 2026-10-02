import { combineReducers, configureStore, createAction } from '@reduxjs/toolkit'
import transactionReducer from './transactionSlice.js'
import planningReducer from './planningSlice.js'
import profileReducer from './profileSlice.js'
import syncReducer from './syncSlice.js'
import { syncMiddleware } from './sync.js'

/** Replace the finance data with what the server returned (no sync). */
export const hydrate = createAction('app/hydrate')
/** Replace the finance data with data found on this device and upload it. */
export const importLocal = createAction('app/importLocal')
/** Clear everything on sign-out. */
export const signOut = createAction('app/signOut')

const appReducer = combineReducers({
  transactions: transactionReducer,
  planning: planningReducer,
  profile: profileReducer,
  sync: syncReducer,
})

// Server data → state. Transactions are ordered by date, then id (ids start with
// a timestamp), so entries added later come later within the same day.
const fromData = (data, sync) => ({
  transactions: {
    transactions: [...(data.transactions || [])].sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id))),
  },
  planning: { budgets: data.budgets || {}, goals: data.goals || [] },
  profile: { name: data.profile?.name || '' },
  sync,
})

const rootReducer = (state, action) => {
  if (hydrate.match(action) || importLocal.match(action)) return fromData(action.payload, state?.sync ?? appReducer(undefined, action).sync)
  if (signOut.match(action)) return appReducer(undefined, action)
  return appReducer(state, action)
}

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) => getDefault().concat(syncMiddleware),
})
