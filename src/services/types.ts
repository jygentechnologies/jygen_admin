export type AdminRole = 'super_admin' | 'admin' | 'sales' | 'viewer'
export type AdminProfile = { id: string; email: string; full_name: string; role: AdminRole; active: boolean }
export type LeadNote = { id: string; contact_id: string; author_id: string; body: string; created_at: string }
export type LeadActivity = { id: string; contact_id: string; actor_id: string | null; actor_name?: string; action: string; details: Record<string, unknown>; created_at: string }
