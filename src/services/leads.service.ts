import type { Lead, LeadStatus } from '../data'
import { supabase } from '../lib/supabase'
import type { AdminProfile } from './types'

type ContactRecord = { id?: string | number; name?: string | null; email?: string | null; company?: string | null; service?: string | null; message?: string | null; phone?: string | null; status?: string | null; priority?: string | null; assigned_to?: string | null; archived?: boolean; updated_at?: string | null; last_contacted_at?: string | null; created_at?: string | null }
export type LeadFilters = { page?: number; pageSize?: number; search?: string; status?: string; priority?: string; service?: string; from?: string; to?: string; fromTimestamp?: string; toTimestamp?: string; sort?: string; direction?: 'asc'|'desc'; archived?: boolean }
export type LeadPage = { rows: Lead[]; total: number }
const statuses: LeadStatus[] = ['New','Contacted','Qualified','Proposal Sent','Closed','Rejected']
const priorities: Lead['priority'][] = ['High','Medium','Low']
function configured() { if (!supabase) throw new Error('Supabase is not configured. Add the project URL and anon/publishable key to .env.local.') }
export function mapContact(record: ContactRecord, index = 0, assignee?: AdminProfile): Lead {
  const status = statuses.find(value => value.toLowerCase() === record.status?.trim().toLowerCase()) ?? 'New'
  const priority = priorities.find(value => value.toLowerCase() === record.priority?.trim().toLowerCase()) ?? 'Medium'
  const date = record.created_at ? new Date(record.created_at) : null
  return { id: String(record.id ?? `contact-${index + 1}`), name: record.name?.trim() || 'New contact', company: record.company?.trim() || 'Independent', email: record.email?.trim() || '', phone: record.phone?.trim() || '', service: record.service?.trim() || 'Not specified', status, priority, date: date && !Number.isNaN(date.valueOf()) ? date.toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'}) : 'Recently received', createdAt:record.created_at ?? '',assignedTo:record.assigned_to ?? null,archived:record.archived ?? false,owner: assignee?.full_name || 'Unassigned', message: record.message?.trim() || '' }
}
export async function listLeadsPage(filters: LeadFilters = {}): Promise<LeadPage> {
  configured()
  const page = Math.max(0, filters.page ?? 0), size = Math.min(100, Math.max(1, filters.pageSize ?? 10))
  const sortKeys: Record<string,string> = { name:'name',email:'email',company:'company',service:'service',status:'status',priority:'priority',date:'created_at',created_at:'created_at' }
  let query = supabase!.from('contacts').select('*', { count:'exact' }).eq('archived', filters.archived ?? false)
  if (filters.status && filters.status !== 'Any status') query = query.eq('status', filters.status)
  if (filters.priority && filters.priority !== 'Any priority') query = query.eq('priority', filters.priority)
  if (filters.service && filters.service !== 'Any service') query = query.eq('service', filters.service)
  if (filters.from) query = query.gte('created_at', `${filters.from}T00:00:00`)
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59.999`)
  const term = filters.search?.trim().replace(/[(),%_*"\\]/g,' ').replace(/\s+/g,' ')
  if (term) { const like = `%${term}%`; query = query.or(`name.ilike.${like},email.ilike.${like},company.ilike.${like},service.ilike.${like},message.ilike.${like}`) }
  const { data, error, count } = await query.order(sortKeys[filters.sort ?? 'date'] ?? 'created_at', { ascending:filters.direction === 'asc', nullsFirst:false }).range(page * size, page * size + size - 1)
  if (error) throw error
  const rows = (data ?? []) as ContactRecord[]
  const assignedIds = [...new Set(rows.map(row => row.assigned_to).filter((id): id is string => Boolean(id)))]
  let profiles: AdminProfile[] = []
  if (assignedIds.length) {
    const { data: admins, error: profileError } = await supabase!.from('admin_profiles').select('id,email,full_name,role,active').in('id', assignedIds)
    if (profileError) throw profileError
    profiles = (admins ?? []) as AdminProfile[]
  }
  return { rows:rows.map((row,index) => mapContact(row,index,profiles.find(profile => profile.id === row.assigned_to))), total:count ?? 0 }
}
export async function listLeads(filters: Pick<LeadFilters,'archived'|'fromTimestamp'|'toTimestamp'> = {}): Promise<Lead[]> {
  configured()
  const records: ContactRecord[] = [], pageSize = 500
  for (let from = 0; ; from += pageSize) {
    let query=supabase!.from('contacts').select('*').eq('archived', filters.archived ?? false)
    if(filters.fromTimestamp)query=query.gte('created_at',filters.fromTimestamp)
    if(filters.toTimestamp)query=query.lte('created_at',filters.toTimestamp)
    const { data, error } = await query.order('created_at',{ascending:false}).range(from,from+pageSize-1)
    if (error) throw error
    const batch = (data ?? []) as ContactRecord[]; records.push(...batch)
    if (batch.length < pageSize) break
  }
  const ids = [...new Set(records.map(row=>row.assigned_to).filter((id):id is string=>Boolean(id)))]
  let profiles: AdminProfile[] = []
  if (ids.length) { const {data,error}=await supabase!.from('admin_profiles').select('id,email,full_name,role,active').in('id',ids); if(error)throw error; profiles=(data??[]) as AdminProfile[] }
  return records.map((row,index)=>mapContact(row,index,profiles.find(profile=>profile.id===row.assigned_to)))
}
export async function listServiceOptions():Promise<string[]> {
  configured()
  const {data,error}=await supabase!.from('contacts').select('service').eq('archived',false).not('service','is',null).limit(1000)
  if(error)throw error
  return [...new Set((data??[]).map(row=>String(row.service??'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b))
}
export async function getLead(id: string): Promise<Lead | null> {
  configured()
  const { data, error } = await supabase!.from('contacts').select('*').eq('id',id).maybeSingle()
  if (error) throw error
  const row=data as ContactRecord|null
  if (!row) return null
  if (!row.assigned_to) return mapContact(row)
  const {data:profile,error:profileError}=await supabase!.from('admin_profiles').select('id,email,full_name,role,active').eq('id',row.assigned_to).maybeSingle()
  if(profileError)throw profileError
  return mapContact(row,0,profile as AdminProfile|undefined)
}
export async function updateLead(id: string, patch: Partial<Pick<ContactRecord,'status'|'priority'|'assigned_to'|'archived'>>): Promise<void> {
  configured()
  const next={...patch,updated_at:new Date().toISOString()}
  if(patch.status==='Contacted')Object.assign(next,{last_contacted_at:new Date().toISOString()})
  const {error}=await supabase!.from('contacts').update(next).eq('id',id)
  if(error)throw error
}
export async function createLead(input: Pick<Lead,'name'|'email'|'company'|'service'|'message'>): Promise<Lead> {
  configured()
  const {data,error}=await supabase!.from('contacts').insert({...input,status:'New'}).select('*').single()
  if(error)throw error
  return mapContact(data as ContactRecord)
}
