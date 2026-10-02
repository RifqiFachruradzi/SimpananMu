import { createContext, useContext } from 'react'

// { user: { email, name }, logout(), changePassword(old, new) } for signed-in screens.
export const SessionContext = createContext(null)
export const useSession = () => useContext(SessionContext)
