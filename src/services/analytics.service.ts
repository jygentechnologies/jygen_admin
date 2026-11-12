import { listLeads } from './leads.service'
import { listActivity } from './activity.service'
import type { Lead, LeadStatus } from '../data'
import type { LeadActivity } from './types'

export type DateRange = { from: Date; to: Date }
export type AnalyticsData = { leads: Lead[]; activity: LeadActivity[]; from: Date; to: Date }
export async function getAnalyticsData(range: DateRange): Promise<AnalyticsData> {
  const from = new Date(range.from); from.setHours(0,0,0,0)
  const to = new Date(range.to); to.setHours(23,59,59,999)
  const [leads, activity] = await Promise.all([listLeads({fromTimestamp:from.toISOString(),toTimestamp:to.toISOString()}), listActivity(undefined,50)])
  return { leads,activity,from,to }
}
export async function getDashboardData(range: DateRange) { return getAnalyticsData(range) }
export const pipelineStages: LeadStatus[] = ['New','Contacted','Qualified','Proposal Sent','Closed','Rejected']
