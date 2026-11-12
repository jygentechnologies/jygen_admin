export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Proposal Sent' | 'Closed' | 'Rejected'
export type Lead = { id: string; name: string; company: string; email: string; phone: string; service: string; status: LeadStatus; priority: 'High' | 'Medium' | 'Low'; date: string; createdAt: string; assignedTo: string | null; archived: boolean; owner: string; message: string }

export const nav = [
  { label:'Overview', path:'/', icon:'grid' }, { label:'Leads', path:'/leads', icon:'inbox' }, { label:'Pipeline', path:'/pipeline', icon:'kanban' },
  { label:'Analytics', path:'/analytics', icon:'chart' }, { label:'Team', path:'/team', icon:'users' },
]
