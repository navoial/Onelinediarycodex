export type { AuthUser } from './authContextBase'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue, type AuthUser } from './authContextBase'

function mapAuthUser(raw: User | null | undefined): AuthUser | null {
  if (!raw) return null
  return {
    id: raw.id,
    email: raw.email ?? undefined,
    fullName: typeof raw.user_metadata?.full_name === 'string' ? raw.user_metadata.full_name : undefined,
  }
}

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
        setUser(mapAuthUser(data.session.user))
        setStatus('authenticated')
      } else {
        setUser(null)
        setStatus('unauthenticated')
      }
    }

    void init()

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(mapAuthUser(session.user))
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
      setUser(null)
      setStatus('unauthenticated')
    }

    async function refreshUser() {
      if (!supabase) throw new Error('Supabase not configured')
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      const nextUser = mapAuthUser(data.user)
      setUser(nextUser)
      setStatus(nextUser ? 'authenticated' : 'unauthenticated')
    }

    return { signIn, signUp, signOut, refreshUser }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({ user, status, ...actions }), [actions, status, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

