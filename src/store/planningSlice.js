import { createSlice } from '@reduxjs/toolkit'

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

// Monthly spending limits per expense category, and savings goals.
const planningSlice = createSlice({
  name: 'planning',
  initialState: { budgets: {}, goals: [] },
  reducers: {
    setBudget: (state, action) => {
      const { category, limit } = action.payload
      if (limit > 0) state.budgets[category] = limit
      else delete state.budgets[category]
    },
    addGoal: {
      reducer: (state, action) => {
        state.goals.push(action.payload)
      },
      prepare: (goal) => ({ payload: { saved: 0, deadline: '', ...goal, id: newId() } }),
    },
    updateGoal: (state, action) => {
      const goal = state.goals.find((g) => g.id === action.payload.id)
      if (goal) Object.assign(goal, action.payload)
    },
    contributeToGoal: (state, action) => {
      const { id, amount } = action.payload
      const goal = state.goals.find((g) => g.id === id)
      if (goal) goal.saved = Math.max(0, goal.saved + amount)
    },
    deleteGoal: (state, action) => {
      state.goals = state.goals.filter((g) => g.id !== action.payload)
    },
  },
})

export const { setBudget, addGoal, updateGoal, contributeToGoal, deleteGoal } = planningSlice.actions
export default planningSlice.reducer
