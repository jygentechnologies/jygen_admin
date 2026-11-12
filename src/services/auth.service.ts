import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AdminProfile, AdminRole } from './types'

export const authEnabled = Boolean(supabase)
export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}
export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase?.auth.onAuthStateChange(callback).data.subscription ?? null
}
export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase is not configured. Add the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  const profile = await getMyProfile()
  if (!profile?.active) {
    await supabase.auth.signOut()
    throw new Error('This account does not have active JYGEN admin access. Contact a workspace administrator.')
  }
  return data
}
export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
export async function requestPasswordReset(email: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
  if (error) throw error
}
export async function updatePassword(password: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}
export async function getMyProfile(): Promise<AdminProfile | null> {
  if (!supabase) return null
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!user) return null
  const { data, error } = await supabase.from('admin_profiles').select('id,email,full_name,role,active').eq('id', user.id).maybeSingle()
  if (error) throw error
  return data as AdminProfile | null
}
export function canAccess(role: AdminRole | undefined, allowed: AdminRole[]) { return Boolean(role && (role === 'super_admin' || allowed.includes(role))) }
