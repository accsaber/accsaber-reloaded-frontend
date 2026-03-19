import type {
  ApproveReweightRequest,
  ApproveUnrankRequest,
  BulkReweightRequest,
  BulkUnrankRequest,
  ImportMapFromLeaderboardIdsRequest,
  UpdateMapComplexityRequest,
  UpdateMapStatusRequest,
} from '@/types/api/admin'
import type { MapDifficultyResponse } from '@/types/api/maps'
import { del, post, put } from '../client'

export function importMap(req: ImportMapFromLeaderboardIdsRequest): Promise<MapDifficultyResponse> {
  return post<MapDifficultyResponse>('/ranking/maps/import', req)
}

export function updateMapStatus(
  difficultyId: string,
  req: UpdateMapStatusRequest,
): Promise<MapDifficultyResponse> {
  return put<MapDifficultyResponse>(`/ranking/maps/difficulties/${difficultyId}/status`, req)
}

export function updateMapComplexity(
  difficultyId: string,
  req: UpdateMapComplexityRequest,
): Promise<MapDifficultyResponse> {
  return put<MapDifficultyResponse>(`/ranking/maps/difficulties/${difficultyId}/complexity`, req)
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
  return post<void>('/ranking/maps/difficulties/reweight', req)
}

export function approveUnrank(req: ApproveUnrankRequest): Promise<void> {
  return post<void>('/ranking/maps/difficulties/unrank', req)
}

export function bulkUnrank(req: BulkUnrankRequest): Promise<void> {
  return post<void>('/ranking/maps/difficulties/unrank/bulk', req)
}
