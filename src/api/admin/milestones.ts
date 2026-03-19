import type { CreateMilestoneRequest, CreateMilestoneSetRequest, LinkMilestoneMapRequest } from '@/types/api/admin'
import type { MilestoneResponse, MilestoneSetResponse } from '@/types/api/milestones'
import type { Schema } from '@/components/admin/MilestoneQueryBuilder.vue'
import { del, get, post, put } from '../client'

export function createMilestone(req: CreateMilestoneRequest): Promise<MilestoneResponse> {
  return post<MilestoneResponse>('/admin/milestones', req)
}

export function updateMilestone(
  id: string,
  req: CreateMilestoneRequest,
): Promise<MilestoneResponse> {
  return put<MilestoneResponse>(`/admin/milestones/${id}`, req)
}

export function deleteMilestone(id: string): Promise<void> {
  return del<void>(`/admin/milestones/${id}`)
}

export function createMilestoneSet(req: CreateMilestoneSetRequest): Promise<MilestoneSetResponse> {
  return post<MilestoneSetResponse>('/admin/milestones/sets', req)
}

export function updateMilestoneSet(
  id: string,
  req: CreateMilestoneSetRequest,
): Promise<MilestoneSetResponse> {
  return put<MilestoneSetResponse>(`/admin/milestones/sets/${id}`, req)
}

export function deleteMilestoneSet(id: string): Promise<void> {
  return del<void>(`/admin/milestones/sets/${id}`)
}

export function getMilestoneSchema(): Promise<Schema> {
  return get<Schema>('/admin/milestones/schema')
}

export function backfillMilestone(id: string): Promise<void> {
  return post<void>(`/admin/milestones/${id}/backfill`)
}

export function refreshMilestoneStats(): Promise<void> {
  return post<void>('/admin/milestones/refresh-stats')
}

export function linkMilestoneMaps(id: string, req: LinkMilestoneMapRequest): Promise<void> {
  return post<void>(`/admin/milestones/${id}/map-links`, req)
}
