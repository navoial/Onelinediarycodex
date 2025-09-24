import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type AuthUser = {
  id: string
  email?: string
}

type AuthContextValue = {
  user: AuthUser | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  useEffect(() => {
    const client = supabase
    if (!client) {
      setStatus('unauthenticated')
      return
    }

    const init = async () => {
      const { data } = await client.auth.getSession()
      if (data.session) {
        setUser({ id: data.session.user.id, email: data.session.user.email ?? undefined })
        setStatus('authenticated')
      } else {
        setUser(null)
        setStatus('unauthenticated')
      }
    }

    void init()

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser({ id: session.user.id, email: session.user.email ?? undefined })
        setStatus('authenticated')
      } else {
        setUser(null)
        setStatus('unauthenticated')
      }
    })

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

  const actions = useMemo(() => {
    async function signIn(email: string, password: string) {
      if (!supabase) throw new Error('Supabase not configured')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    }

    async function signUp(email: string, password: string) {
      if (!supabase) throw new Error('Supabase not configured')
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
    }

    async function signOut() {
      if (!supabase) throw new Error('Supabase not configured')
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    }

    return { signIn, signUp, signOut }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({ user, status, ...actions }), [actions, status, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
