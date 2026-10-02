import { createSlice } from '@reduxjs/toolkit'

const profileSlice = createSlice({
  name: 'profile',
  initialState: { name: '' },
  reducers: {
    setName: (state, action) => {
      state.name = action.payload.trim().slice(0, 30)
    },
  },
})

export const { setName } = profileSlice.actions
export default profileSlice.reducer
