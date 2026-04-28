import type { PublicMapDifficultyResponse } from './maps'
import type { ScoreResponse } from './users'

export interface SnipeComparisonResponse {
  mapDifficulty: PublicMapDifficultyResponse
  sniperScore: ScoreResponse
  targetScore: ScoreResponse
  scoreDelta: number
}
