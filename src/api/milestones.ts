import type {
  MilestoneCompletionResponse,
  MilestoneHolderResponse,
  MilestoneListParams,
  MilestoneResponse,
  MilestoneSetResponse,
  PrerequisiteLinkResponse,
  SetGroupResponse,
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

export function getMilestoneSet(setId: string): Promise<MilestoneSetResponse> {
  return get<MilestoneSetResponse>(`/milestones/sets/${setId}`)
}

export function getMilestone(id: string): Promise<MilestoneResponse> {
  return get<MilestoneResponse>(`/milestones/${id}`)
}

export function getMilestonesBySet(setId: string): Promise<MilestoneResponse[]> {
  return get<MilestoneResponse[]>(`/milestones/sets/${setId}/milestones`)
}

export function getPrerequisites(): Promise<PrerequisiteLinkResponse[]> {
  return get<PrerequisiteLinkResponse[]>('/milestones/prerequisites')
}

export function getMilestoneHolders(milestoneId: string): Promise<Page<MilestoneHolderResponse>> {
  return get<Page<MilestoneHolderResponse>>(`/milestones/${milestoneId}/holders?size=50`)
}

export function getSetGroups(): Promise<SetGroupResponse[]> {
  return get<SetGroupResponse[]>('/milestones/set-groups')
}

export type MilestoneSort = 'tier' | 'completions' | 'completedAt' | 'progress'

export function getMilestoneCompletionStats(userId?: string): Promise<MilestoneCompletionResponse[]> {
  return get<MilestoneCompletionResponse[]>(`/milestones/completion-stats${buildQuery({ userId })}`)
}
