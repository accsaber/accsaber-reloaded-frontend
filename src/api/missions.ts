import type {
  CommunityContributorResponse,
  CommunityMissionListParams,
  MissionListParams,
  MissionResponse,
} from '@/types/api/missions'
import type { Page, PaginationParams } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export function getMyMissions(params?: MissionListParams): Promise<MissionResponse[]> {
  return get<MissionResponse[]>(`/users/me/missions${buildQuery(params)}`)
}

export function getMyCompletedMissions(): Promise<MissionResponse[]> {
  return get<MissionResponse[]>(`/users/me/missions${buildQuery({ completed: true })}`)
}

export function getCommunityMissions(
  params?: CommunityMissionListParams,
): Promise<MissionResponse[]> {
  return get<MissionResponse[]>(`/missions/community${buildQuery(params)}`)
}

export function getCommunityContributors(
  missionId: string,
  params?: PaginationParams,
): Promise<Page<CommunityContributorResponse>> {
  return get<Page<CommunityContributorResponse>>(
    `/missions/community/${missionId}/contributors${buildQuery(params)}`,
  )
}
