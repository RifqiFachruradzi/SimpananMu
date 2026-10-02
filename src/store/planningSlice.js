import { createSlice } from '@reduxjs/toolkit'

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

// Monthly spending limits per expense category, and savings goals.
export const defaultPlanningState = () => ({
  budgets: {
    'Bahan Baku': 1000000,
    Marketing: 600000,
    Tagihan: 500000,
    Transportasi: 300000,
  },
  goals: [
    { id: 'goal-1', name: 'Dana Darurat', target: 15000000, saved: 4500000, deadline: '' },
    { id: 'goal-2', name: 'Laptop Baru', target: 12000000, saved: 2000000, deadline: '' },
  ],
})

const planningSlice = createSlice({
  name: 'planning',
  initialState: defaultPlanningState,
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
