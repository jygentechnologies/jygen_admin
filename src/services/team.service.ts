import { supabase } from '../lib/supabase'
import type { AdminProfile } from './types'
export async function listTeam(): Promise<AdminProfile[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('admin_profiles').select('id,email,full_name,role,active').order('full_name')
  if (error) throw error
  return (data ?? []) as AdminProfile[]
}
export async function updateTeamMember(id: string, patch: Partial<Pick<AdminProfile,'role'|'active'|'full_name'>>) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('admin_profiles').update(patch).eq('id', id)
  if (error) throw error
}
export async function checkDatabaseConnection():Promise<void>{
  if(!supabase)throw new Error('Supabase is not configured.')
  const {error}=await supabase.from('admin_profiles').select('id').limit(1)
  if(error)throw error
}
