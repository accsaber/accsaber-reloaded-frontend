import type { PublicMapDifficultyResponse } from './maps'
import type { ScoreResponse } from './users'

export type SnipeSort = 'GAP' | 'AP_GAP' | 'TARGET_AP' | 'YOUR_AP' | 'RANK_GAP'

export type SnipeUnplayed = 'EXCLUDE' | 'INCLUDE' | 'ONLY'

export interface SnipeComparisonResponse {
  mapDifficulty: PublicMapDifficultyResponse
  sniperScore: ScoreResponse | null
  targetScore: ScoreResponse
  scoreDelta: number
}
