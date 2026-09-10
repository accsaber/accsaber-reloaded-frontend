import type {
  ApplyScriptParams,
  ComplexityDatasetKind,
  ComplexityPreviewParams,
  ComplexityPreviewResponse,
  ComplexityRaterResponse,
  ComplexityRaterSpec,
  ComplexityDifficultyParams,
  ComplexityDifficultyRow,
  ComplexityMapLeaderboard,
  ComplexityPlayerBoard,
  ComplexityPlayerParams,
  ComplexityPlayerPlays,
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

export function getComplexityPlayers(
  params?: ComplexityPlayerParams,
): Promise<ComplexityPlayerBoard> {
  return get<ComplexityPlayerBoard>(`${BASE}/players${buildQuery(params)}`)
}

export function getPlayerPlays(userId: string, limit: number): Promise<ComplexityPlayerPlays> {
  return get<ComplexityPlayerPlays>(`${BASE}/players/${userId}/plays${buildQuery({ limit })}`)
}

export function previewPlayerPlays(
  userId: string,
  rater: ComplexityRaterSpec,
  limit: number,
): Promise<ComplexityPlayerPlays> {
  return post<ComplexityPlayerPlays>(
    `${BASE}/preview/players/${userId}/plays${buildQuery({ limit })}`,
    rater,
  )
}

export function getComplexityRater(): Promise<ComplexityRaterResponse> {
  return get<ComplexityRaterResponse>(`${BASE}/rater`)
}

export function previewComplexity(
  rater: ComplexityRaterSpec,
  params: ComplexityPreviewParams,
): Promise<ComplexityPreviewResponse> {
  return post<ComplexityPreviewResponse>(`${BASE}/preview${buildQuery(params)}`, rater)
}

export function applyComplexityScript(params: ApplyScriptParams): Promise<void> {
  return post<void>(`${BASE}/apply${buildQuery(params)}`)
}

export function downloadComplexityDataset(kind: ComplexityDatasetKind): Promise<DownloadedFile> {
  return getFile(`${BASE}/dataset/${kind}`)
}
