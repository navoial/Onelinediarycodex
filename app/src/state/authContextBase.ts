import { createContext } from 'react'

export type AuthUser = {
  id: string
  email?: string
  fullName?: string
}

export type AuthContextValue = {
  user: AuthUser | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
