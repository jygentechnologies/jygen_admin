import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Null until the project URL and browser-safe publishable key are configured. */
export const supabase = url && key ? createClient(url, key) : null
