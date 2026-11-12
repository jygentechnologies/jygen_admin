import { supabase } from '../lib/supabase'
import type { LeadNote } from './types'
export async function listNotes(contactId: string): Promise<LeadNote[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('lead_notes').select('*').eq('contact_id', contactId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as LeadNote[]
}
export async function addNote(contactId: string, body: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('lead_notes').insert({ contact_id: contactId, body })
  if (error) throw error
}
