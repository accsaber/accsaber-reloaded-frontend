import type { Difficulty, MapDifficultyStatus, VoteType } from '../enums'
import type { PaginationParams } from '../pagination'

export interface MapResponse {
  id: string
  songName: string
  songAuthor: string
  songHash: string
  mapAuthor: string
  beatsaverCode: string
  coverUrl: string
  difficulties: MapDifficultyResponse[]
  createdAt: string
}

export interface MapDifficultyResponse {
  id: string
  mapId: string
  songName: string
  songAuthor: string
  mapAuthor: string
  coverUrl: string
  categoryId: string
  previousVersionId: string | null
  difficulty: Difficulty
  characteristic: string
  active: boolean
  status: MapDifficultyStatus
  criteriaStatus: string
  ssLeaderboardId: string | null
  blLeaderboardId: string | null
  maxScore: number
  complexity: number
  rankedAt: string | null
  lastUpdatedBy: string | null
  lastUpdatedByUsername: string | null
  statistics: MapDifficultyStatisticsResponse | null
}

export interface TopScoreSnapshot {
  scoreId: string
  userId: string
  userName: string
  avatarUrl: string
  score: number
  accuracy: number
  ap: number
  timeSet: string
}

export interface MapDifficultyStatisticsResponse {
  id: string
  maxAp: number
  minAp: number
  averageAp: number
  totalScores: number
  topScore: TopScoreSnapshot | null
  createdAt: string
}

export interface MapComplexityHistoryResponse {
  id: string
  mapDifficultyId: string
  complexity: number
  createdAt: string
}

export interface VoteResponse {
  id: string
  mapDifficultyId: string
  staffId: string
  vote: boolean
  type: VoteType
  suggestedComplexity: number | null
  criteriaVote: boolean | null
  criteriaVoteOverride: boolean | null
  reason: string | null
  active: boolean
  updatedAt: string
}

export interface VoteListResponse {
  votes: VoteResponse[]
  rankThresholdMet: boolean
  criteriaThresholdMet: boolean
}

export interface MapListParams extends PaginationParams {
  categoryId?: string
  status?: MapDifficultyStatus
}

export interface DifficultyListParams extends PaginationParams {
  categoryId?: string
  status?: MapDifficultyStatus
  complexityMin?: number
  complexityMax?: number
}

export interface DifficultyScoreParams extends PaginationParams {
  country?: string
}

