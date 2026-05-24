import type { MissionListParams, UserMissionResponse } from '@/types/api/missions'
import { get } from '../client'
import { buildQuery } from '../utils'

export function getUserMissions(
  userId: string,
  params?: MissionListParams,
): Promise<UserMissionResponse[]> {
  return get<UserMissionResponse[]>(`/admin/missions/users/${userId}${buildQuery(params)}`)
}

export function getUserCompletedMissions(userId: string): Promise<UserMissionResponse[]> {
  return get<UserMissionResponse[]>(`/admin/missions/users/${userId}/completed`)
}
