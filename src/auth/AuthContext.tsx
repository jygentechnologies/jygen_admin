import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { authEnabled, getMyProfile, getSession, onAuthStateChange, requestPasswordReset, signIn, signOut, updatePassword } from '../services/auth.service'
import type { AdminProfile, AdminRole } from '../services/types'

type AuthValue = { ready: boolean; session: Session | null; profile: AdminProfile | null; role?: AdminRole; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; resetPassword: (email: string) => Promise<void>; updatePassword: (password: string) => Promise<void> }
const AuthContext = createContext<AuthValue | null>(null)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  useEffect(() => {
    let active = true
    void getSession().then(async current => {
      if (!active) return
      setSession(current)
      if (current) {
        try { const next = await getMyProfile(); if (active) setProfile(next) } catch { if (active) setProfile(null) }
      }
      if (active) setReady(true)
    }).catch(() => { if (active) setReady(true) })
    const subscription = onAuthStateChange((_event, current) => {
      setSession(current)
      if (!current) { setProfile(null); setReady(true); return }
      void getMyProfile().then(next => { setProfile(next); setReady(true) }).catch(() => { setProfile(null); setReady(true) })
    })
    return () => { active = false; subscription?.unsubscribe() }
  }, [])
  const value = useMemo<AuthValue>(() => ({
    ready, session, profile, role: profile?.role,
    login: async (email, password) => {
      const result = await signIn(email, password); setSession(result.session); setProfile(await getMyProfile())
    },
    logout: async () => { await signOut(); setSession(null); setProfile(null) },
    resetPassword: requestPasswordReset,
    updatePassword,
  }), [ready, session, profile])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value }
