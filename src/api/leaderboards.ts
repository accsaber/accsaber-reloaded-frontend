import type { PlayerScope } from '@/types/api/relations'
import type { LeaderboardResponse, XpLeaderboardResponse } from '@/types/api/users'
import type { Page, PaginationParams } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export interface LeaderboardParams extends PaginationParams, PlayerScope {
  inactiveUsers?: boolean
}

export function getLeaderboard(
  categoryId: string,
  params?: LeaderboardParams,
): Promise<Page<LeaderboardResponse>> {
  return get<Page<LeaderboardResponse>>(`/leaderboards/${categoryId}${buildQuery(params)}`)
}

export function getXpLeaderboard(
  params?: LeaderboardParams,
): Promise<Page<XpLeaderboardResponse>> {
  return get<Page<XpLeaderboardResponse>>(`/leaderboards/xp${buildQuery(params)}`)
}
