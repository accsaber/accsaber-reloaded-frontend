import type { MissionListParams, UserMissionResponse } from '@/types/api/missions'
import { get } from './client'
import { buildQuery } from './utils'

export function getMyMissions(params?: MissionListParams): Promise<UserMissionResponse[]> {
  return get<UserMissionResponse[]>(`/users/me/missions${buildQuery(params)}`)
}

export function getMyCompletedMissions(): Promise<UserMissionResponse[]> {
  return get<UserMissionResponse[]>('/users/me/missions/completed')
}
