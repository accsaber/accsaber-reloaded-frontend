import type {
  DifficultyListParams,
  DifficultyScoreParams,
  MapComplexityHistoryResponse,
  MapDifficultyResponse,
  MapDifficultyStatisticsResponse,
  MapListParams,
  MapResponse,
} from '@/types/api/maps'
import type { ScoreResponse } from '@/types/api/users'
import type { Page } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export function getMaps(params?: MapListParams): Promise<Page<MapResponse>> {
  return get<Page<MapResponse>>(`/maps${buildQuery(params)}`)
}

export function getMap(mapId: string): Promise<MapResponse> {
  return get<MapResponse>(`/maps/${mapId}`)
}

export function getMapDifficulties(mapId: string): Promise<MapDifficultyResponse[]> {
  return get<MapDifficultyResponse[]>(`/maps/${mapId}/difficulties`)
}

export function getDifficulties(params?: DifficultyListParams): Promise<Page<MapDifficultyResponse>> {
  return get<Page<MapDifficultyResponse>>(`/maps/difficulties${buildQuery(params)}`)
}

export function getDifficultyScores(
  difficultyId: string,
  params?: DifficultyScoreParams,
): Promise<Page<ScoreResponse>> {
  return get<Page<ScoreResponse>>(`/maps/difficulties/${difficultyId}/scores${buildQuery(params)}`)
}

export function getDifficultyStatistics(difficultyId: string): Promise<MapDifficultyStatisticsResponse> {
  return get<MapDifficultyStatisticsResponse>(`/maps/difficulties/${difficultyId}/statistics`)
}

export function getDifficultyStatisticsHistoric(
  difficultyId: string,
  params: { amount: number; unit: string },
): Promise<MapDifficultyStatisticsResponse[]> {
  return get<MapDifficultyStatisticsResponse[]>(
    `/maps/difficulties/${difficultyId}/statistics/historic${buildQuery(params)}`,
  )
}

export function getComplexityHistory(mapId: string): Promise<MapComplexityHistoryResponse[]> {
  return get<MapComplexityHistoryResponse[]>(`/maps/${mapId}/complexity-history`)
}
