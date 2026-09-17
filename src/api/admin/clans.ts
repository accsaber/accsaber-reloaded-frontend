import type {
  ClanCapacity,
  ClanCapacityRequest,
  ClanLevelStepResponse,
  ClanResponse,
  ClanSeasonRequest,
  ClanSeasonResponse,
  ClanSeasonRewardRequest,
  ClanSeasonRewardResponse,
  ClanWarModeAxis,
  ClanWarModeRequest,
  ClanWarRewardItemRequest,
  ClanWarRewardItemResponse,
  ModerateClanRequest,
} from '@/types/api/clans'
import { del, get, patch, post, put } from '../client'
import { buildQuery } from '../utils'

export function setClanLevelCapacity(
  level: number,
  capacity: ClanCapacity,
  req: ClanCapacityRequest,
): Promise<ClanLevelStepResponse[]> {
  return put<ClanLevelStepResponse[]>(`/admin/clans/levels/${level}/capacities/${capacity}`, req)
}

export function removeClanLevelCapacity(
  level: number,
  capacity: ClanCapacity,
): Promise<ClanLevelStepResponse[]> {
  return del<ClanLevelStepResponse[]>(`/admin/clans/levels/${level}/capacities/${capacity}`)
}

export function setClanWarMode(
  axis: ClanWarModeAxis,
  mode: string,
  req: ClanWarModeRequest,
): Promise<ClanLevelStepResponse[]> {
  return put<ClanLevelStepResponse[]>(`/admin/clans/war-modes/${axis}/${mode}`, req)
}

export function removeClanWarMode(
  axis: ClanWarModeAxis,
  mode: string,
): Promise<ClanLevelStepResponse[]> {
  return del<ClanLevelStepResponse[]>(`/admin/clans/war-modes/${axis}/${mode}`)
}

export function setClanLevelItem(level: number, itemId: string): Promise<ClanLevelStepResponse[]> {
  return put<ClanLevelStepResponse[]>(`/admin/clans/levels/${level}/items/${itemId}`)
}

export function removeClanLevelItem(itemId: string): Promise<ClanLevelStepResponse[]> {
  return del<ClanLevelStepResponse[]>(`/admin/clans/level-items/${itemId}`)
}

export function createClanSeason(req: ClanSeasonRequest): Promise<ClanSeasonResponse> {
  return post<ClanSeasonResponse>('/admin/clans/seasons', req)
}

export function updateClanSeason(
  seasonId: string,
  req: ClanSeasonRequest,
): Promise<ClanSeasonResponse> {
  return patch<ClanSeasonResponse>(`/admin/clans/seasons/${seasonId}`, req)
}

export function getClanSeasonRewards(seasonId: string): Promise<ClanSeasonRewardResponse[]> {
  return get<ClanSeasonRewardResponse[]>(`/admin/clans/seasons/${seasonId}/rewards`)
}

export function addClanSeasonReward(
  seasonId: string,
  req: ClanSeasonRewardRequest,
): Promise<ClanSeasonRewardResponse> {
  return post<ClanSeasonRewardResponse>(`/admin/clans/seasons/${seasonId}/rewards`, req)
}

export function removeClanSeasonReward(rewardId: string): Promise<void> {
  return del<void>(`/admin/clans/seasons/rewards/${rewardId}`)
}

export function getClanWarRewards(): Promise<ClanWarRewardItemResponse[]> {
  return get<ClanWarRewardItemResponse[]>('/admin/clans/war-rewards')
}

export function addClanWarReward(
  req: ClanWarRewardItemRequest,
): Promise<ClanWarRewardItemResponse> {
  return post<ClanWarRewardItemResponse>('/admin/clans/war-rewards', req)
}

export function updateClanWarReward(
  rewardId: string,
  req: ClanWarRewardItemRequest,
): Promise<ClanWarRewardItemResponse> {
  return patch<ClanWarRewardItemResponse>(`/admin/clans/war-rewards/${rewardId}`, req)
}

export function retireClanWarReward(rewardId: string): Promise<void> {
  return del<void>(`/admin/clans/war-rewards/${rewardId}`)
}

export function moderateClan(clanId: string, req: ModerateClanRequest): Promise<ClanResponse> {
  return patch<ClanResponse>(`/admin/clans/${clanId}`, req)
}

export function disbandClanByStaff(clanId: string, reason: string): Promise<void> {
  return del<void>(`/admin/clans/${clanId}${buildQuery({ reason })}`)
}
