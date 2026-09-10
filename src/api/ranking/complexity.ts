import type {
  ComplexityDatasetKind,
  ComplexityDifficultyParams,
  ComplexityDifficultyRow,
  ComplexityMapLeaderboard,
  ComplexityPlayerBoard,
  ComplexityPlayerParams,
  EstimateScenario,
  HighestAverageApParams,
} from '@/types/api/complexity'
import type { DownloadedFile } from '../client'
import { get, getFile, post } from '../client'
import { buildQuery } from '../utils'

const BASE = '/ranking/complexity'

export function getComplexityDifficulties(
  params?: ComplexityDifficultyParams,
): Promise<ComplexityDifficultyRow[]> {
  return get<ComplexityDifficultyRow[]>(`${BASE}/difficulties${buildQuery(params)}`)
}

export function getComplexityLeaderboard(
  mapDifficultyId: string,
): Promise<ComplexityMapLeaderboard> {
  return get<ComplexityMapLeaderboard>(`${BASE}/difficulties/${mapDifficultyId}/leaderboard`)
}

export function getHighestAverageApMaps(
  params: HighestAverageApParams,
): Promise<ComplexityDifficultyRow[]> {
  return get<ComplexityDifficultyRow[]>(`${BASE}/leaderboards/highest-avg-ap${buildQuery(params)}`)
}

export function getComplexityPlayers(
  params?: ComplexityPlayerParams,
): Promise<ComplexityPlayerBoard> {
  return get<ComplexityPlayerBoard>(`${BASE}/players${buildQuery(params)}`)
}

export function applyComplexityScenario(
  scenario: EstimateScenario,
  reason: string,
): Promise<void> {
  return post<void>(`${BASE}/apply${buildQuery({ scenario, reason })}`)
}

export function downloadComplexityDataset(kind: ComplexityDatasetKind): Promise<DownloadedFile> {
  return getFile(`${BASE}/dataset/${kind}`)
}
