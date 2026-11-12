import { supabase } from '../lib/supabase'
import type { LeadActivity } from './types'
export async function listActivity(contactId?: string, limit = 30): Promise<LeadActivity[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  let query = supabase.from('lead_activity').select('*').order('created_at', { ascending: false }).limit(limit)
  if (contactId) query = query.eq('contact_id', contactId)
  const { data, error } = await query
  if (error) throw error
  const rows=(data??[]) as LeadActivity[]
  const ids=[...new Set(rows.map(row=>row.actor_id).filter((id):id is string=>Boolean(id)))]
  if(!ids.length)return rows
  const {data:profiles,error:profileError}=await supabase.from('admin_profiles').select('id,full_name,email').in('id',ids)
  if(profileError)throw profileError
  const names=new Map((profiles??[]).map(profile=>[profile.id,String(profile.full_name||profile.email||'JYGEN admin')]))
  return rows.map(row=>({...row,actor_name:row.actor_id?names.get(row.actor_id)||'JYGEN admin':'System'}))
}
export async function recordActivity(contactId: string, action: string, details: Record<string, unknown> = {}) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('lead_activity').insert({ contact_id: contactId, action, details })
  if (error) throw error
}
