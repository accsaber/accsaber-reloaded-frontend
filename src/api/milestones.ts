import type {
  MilestoneListParams,
  MilestoneResponse,
  MilestoneSetResponse,
} from '@/types/api/milestones'
import type { Page, PaginationParams } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export function getMilestones(params?: MilestoneListParams): Promise<Page<MilestoneResponse>> {
  return get<Page<MilestoneResponse>>(`/milestones${buildQuery(params)}`)
}

export function getMilestoneSets(params?: PaginationParams): Promise<Page<MilestoneSetResponse>> {
  return get<Page<MilestoneSetResponse>>(`/milestones/sets${buildQuery(params)}`)
}

export function getMilestone(id: string): Promise<MilestoneResponse> {
  return get<MilestoneResponse>(`/milestones/${id}`)
}

export function getMilestonesBySet(setId: string): Promise<MilestoneResponse[]> {
  return get<MilestoneResponse[]>(`/milestones/sets/${setId}/milestones`)
}

export function getLevels(): Promise<{ levels: { level: number; xpRequired: number }[] }> {
  return get('/milestones/levels')
}
