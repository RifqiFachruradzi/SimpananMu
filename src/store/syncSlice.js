import { createSlice } from '@reduxjs/toolkit'

// Status of saving changes to the server, shown in the top bar.
const syncSlice = createSlice({
  name: 'sync',
  initialState: { status: 'idle', pending: 0, error: '' }, // idle | saving | error
  reducers: {
    syncStatus: (state, action) => ({ ...state, ...action.payload }),
  },
})

export const { syncStatus } = syncSlice.actions
export default syncSlice.reducer
