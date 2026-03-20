import type { Schema } from '@/components/admin/MilestoneQueryBuilder.vue'
import type {
  ActivateMilestonesRequest,
  AdminMilestoneListParams,
  CreateMilestoneRequest,
  CreateMilestoneSetRequest,
  LinkMilestoneMapRequest,
} from '@/types/api/admin'
import type { MilestoneResponse, MilestoneSetResponse } from '@/types/api/milestones'
import type { Page } from '@/types/pagination'
import { get, patch, post } from '../client'
import { buildQuery } from '../utils'

export function getAdminMilestones(params?: AdminMilestoneListParams): Promise<Page<MilestoneResponse>> {
  return get<Page<MilestoneResponse>>(`/admin/milestones${buildQuery(params)}`)
}

export function createMilestone(req: CreateMilestoneRequest): Promise<MilestoneResponse> {
  return post<MilestoneResponse>('/admin/milestones', req)
}

export function deactivateMilestone(id: string): Promise<MilestoneResponse> {
  return patch<MilestoneResponse>(`/admin/milestones/${id}`)
}

export function createMilestoneSet(req: CreateMilestoneSetRequest): Promise<MilestoneSetResponse> {
  return post<MilestoneSetResponse>('/admin/milestones/sets', req)
}

export function getMilestoneSchema(): Promise<Schema> {
  return get<Schema>('/admin/milestones/schema')
}

export function activateMilestone(id: string): Promise<MilestoneResponse> {
  return post<MilestoneResponse>(`/admin/milestones/activate/${id}`)
}

export function activateMilestones(ids: string[]): Promise<MilestoneResponse[]> {
  const body: ActivateMilestonesRequest = { milestoneIds: ids }
  return post<MilestoneResponse[]>('/admin/milestones/activate', body)
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
