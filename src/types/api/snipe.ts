import type { PublicMapDifficultyResponse } from './maps'
import type { ScoreResponse } from './users'
import type { SortDirection } from '../display'
import type { PaginationParams } from '../pagination'

export type SnipeSort = 'GAP' | 'AP_GAP' | 'TARGET_AP' | 'YOUR_AP' | 'RANK_GAP'

export type SnipeUnplayed = 'EXCLUDE' | 'INCLUDE' | 'ONLY'

export interface SnipeComparisonResponse {
  mapDifficulty: PublicMapDifficultyResponse
  sniperScore: ScoreResponse | null
  targetScore: ScoreResponse
  scoreDelta: number
}

export interface SnipeListParams extends Pick<PaginationParams, 'page' | 'size'> {
  category?: string
  sort?: SnipeSort
  direction?: SortDirection
  unplayed?: SnipeUnplayed
}
