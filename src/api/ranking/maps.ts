import type {
  BulkReweightRequest,
  ImportMapFromLeaderboardIdsRequest,
  UpdateMapComplexityRequest,
} from '@/types/api/admin'
import type {
  AutoCriteriaCheckResponse,
  DifficultyListParams,
  LeaderboardPreviewResponse,
  MapDifficultyResponse,
  MapListParams,
  MapResponse,
  RefreshDifficultyRequest,
} from '@/types/api/maps'
import type { Page } from '@/types/pagination'
import { get, patch, post } from '../client'
import { buildQuery } from '../utils'

export function getLeaderboardPreview(
  mapDifficultyId: string,
  limit = 100,
): Promise<LeaderboardPreviewResponse> {
  return get<LeaderboardPreviewResponse>(
    `/ranking/maps/difficulties/${mapDifficultyId}/leaderboard-preview${buildQuery({ limit })}`,
  )
}

export function setMapWarBanned(mapId: string, banned: boolean): Promise<MapResponse> {
  return patch<MapResponse>(`/ranking/maps/${mapId}/war-banned${buildQuery({ banned })}`)
}

export function getRankingMaps(params?: MapListParams): Promise<Page<MapResponse>> {
  return get<Page<MapResponse>>(`/ranking/maps${buildQuery(params)}`)
}

export function getRankingMap(mapId: string): Promise<MapResponse> {
  return get<MapResponse>(`/ranking/maps/${mapId}`)
}

export function getRankingDifficulty(difficultyId: string): Promise<MapDifficultyResponse> {
  return get<MapDifficultyResponse>(`/ranking/maps/difficulties/${difficultyId}`)
}

export function getRankingDifficulties(
  params?: DifficultyListParams,
): Promise<Page<MapDifficultyResponse>> {
  return get<Page<MapDifficultyResponse>>(`/ranking/maps/difficulties${buildQuery(params)}`)
}

export function getDeactivatedDifficulties(
  params?: DifficultyListParams,
): Promise<Page<MapDifficultyResponse>> {
  const query = buildQuery({ sort: 'updatedAt,desc', ...params, active: false })
  return get<Page<MapDifficultyResponse>>(`/ranking/maps/difficulties${query}`)
}

export function importMap(req: ImportMapFromLeaderboardIdsRequest): Promise<MapDifficultyResponse> {
  return post<MapDifficultyResponse>('/ranking/maps/import', req)
}

export function updateMapComplexity(
  difficultyId: string,
  req: UpdateMapComplexityRequest,
): Promise<MapDifficultyResponse> {
  return post<MapDifficultyResponse>(`/ranking/maps/difficulties/${difficultyId}/complexity`, req)
}

export function setComplexityPin(
  difficultyId: string,
  pinned: boolean,
): Promise<MapDifficultyResponse> {
  return patch<MapDifficultyResponse>(
    `/ranking/maps/difficulties/${difficultyId}/complexity-pin${buildQuery({ pinned })}`,
  )
}

export function refreshDifficulty(
  difficultyId: string,
  req: RefreshDifficultyRequest,
): Promise<MapDifficultyResponse> {
  return post<MapDifficultyResponse>(`/ranking/maps/difficulties/${difficultyId}/refresh`, req)
}

export function runAutoCriteriaCheck(
  difficultyId: string,
): Promise<AutoCriteriaCheckResponse> {
  return post<AutoCriteriaCheckResponse>(
    `/ranking/maps/difficulties/${difficultyId}/auto-criteria-check`,
  )
}

export function updateMapCategory(
  difficultyId: string,
  req: { categoryId: string },
): Promise<MapDifficultyResponse> {
  return patch<MapDifficultyResponse>(`/ranking/maps/difficulties/${difficultyId}/category`, req)
}

export function deactivateMapDifficulty(difficultyId: string): Promise<void> {
  return patch<void>(`/ranking/maps/difficulties/${difficultyId}/deactivate`)
}

export function bulkReweight(req: BulkReweightRequest): Promise<void> {
  return post<void>('/ranking/maps/difficulties/bulk-reweight', req)
}
