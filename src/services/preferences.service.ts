import { supabase } from '../lib/supabase'
export type AdminPreference = { id:string; admin_id:string; preference_key:string; preference_value:Record<string,unknown>; updated_at:string }
export async function getPreferences():Promise<Record<string,Record<string,unknown>>> {
  if(!supabase)throw new Error('Supabase is not configured.')
  const {data,error}=await supabase.from('admin_preferences').select('preference_key,preference_value')
  if(error)throw error
  return Object.fromEntries((data??[]).map(item=>[item.preference_key,item.preference_value as Record<string,unknown>]))
}
export async function savePreference(key:string,value:Record<string,unknown>):Promise<void> {
  if(!supabase)throw new Error('Supabase is not configured.')
  const {data:{user},error:userError}=await supabase.auth.getUser()
  if(userError)throw userError
  if(!user)throw new Error('Your session expired. Sign in again.')
  const {error}=await supabase.from('admin_preferences').upsert({admin_id:user.id,preference_key:key,preference_value:value,updated_at:new Date().toISOString()},{onConflict:'admin_id,preference_key'})
  if(error)throw error
}
