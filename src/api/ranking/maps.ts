import type {
  ApproveReweightRequest,
  ApproveUnrankRequest,
  BulkReweightRequest,
  BulkUnrankRequest,
  ImportMapFromLeaderboardIdsRequest,
  UpdateMapComplexityRequest,
  UpdateMapStatusRequest,
} from '@/types/api/admin'
import type { DifficultyListParams, MapDifficultyResponse } from '@/types/api/maps'
import type { Page } from '@/types/pagination'
import { del, get, patch, post } from '../client'
import { buildQuery } from '../utils'

export function getDeactivatedDifficulties(
  params?: DifficultyListParams,
): Promise<Page<MapDifficultyResponse>> {
  return get<Page<MapDifficultyResponse>>(`/ranking/maps/difficulties/deactivated${buildQuery(params)}`)
}

export function importMap(req: ImportMapFromLeaderboardIdsRequest): Promise<MapDifficultyResponse> {
  return post<MapDifficultyResponse>('/ranking/maps/import', req)
}

export function updateMapStatus(
  difficultyId: string,
  req: UpdateMapStatusRequest,
): Promise<MapDifficultyResponse> {
  return patch<MapDifficultyResponse>(`/ranking/maps/difficulties/${difficultyId}/status`, req)
}

export function updateMapComplexity(
  difficultyId: string,
  req: UpdateMapComplexityRequest,
): Promise<MapDifficultyResponse> {
  return post<MapDifficultyResponse>(`/ranking/maps/difficulties/${difficultyId}/complexity`, req)
}

export function deactivateMapDifficulty(difficultyId: string): Promise<void> {
  return del<void>(`/ranking/maps/difficulties/${difficultyId}`)
}

export function approveReweight(
  difficultyId: string,
  req: ApproveReweightRequest,
): Promise<MapDifficultyResponse> {
  return post<MapDifficultyResponse>(`/ranking/maps/difficulties/${difficultyId}/reweight`, req)
}

export function bulkReweight(req: BulkReweightRequest): Promise<void> {
  return post<void>('/ranking/maps/difficulties/bulk-reweight', req)
}

export function approveUnrank(req: ApproveUnrankRequest): Promise<void> {
  return post<void>('/ranking/maps/difficulties/unrank', req)
}

export function bulkUnrank(req: BulkUnrankRequest): Promise<void> {
  return post<void>('/ranking/maps/difficulties/unrank/bulk', req)
}
