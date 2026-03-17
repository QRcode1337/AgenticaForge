import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { supabase } from '../lib/supabase.ts'
import type { User, Session } from '@supabase/supabase-js'

// ── Types ────────────────────────────────────────────────────────

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

type AuthContextValue = AuthState & AuthActions

// ── Context ──────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ─────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, session, loading: false })
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session, loading: false })
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return createElement(
    AuthContext.Provider,
    { value: { ...state, signIn, signUp, signOut } },
    children,
  )
}

// ── Hook ─────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
