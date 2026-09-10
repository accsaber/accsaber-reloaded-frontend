import type { Difficulty, MapDifficultyStatus } from '@/types/enums'

export type ComplexityScenario = 'CURRENT' | 'NEW_SCRIPT' | 'PREVIEW'

export type EstimateScenario = 'NEW_SCRIPT'

export type ComparisonScenario = Exclude<ComplexityScenario, 'CURRENT'>

export type ComplexityDatasetKind = 'scores' | 'difficulties' | 'complexity-history'

export interface ScenarioMapValues {
  complexity: number | null
  topAp: number | null
  averageAp: number | null
  averageWeightedAp: number | null
  boardRank: number | null
}

export interface ComplexityEstimateInfo {
  version: string
  updatedAt: string
  inputs: Record<string, unknown>
}

export interface ComplexityDifficultyRow {
  mapDifficultyId: string
  mapId: string
  songName: string
  songSubName: string | null
  songAuthor: string
  mapAuthor: string
  coverUrl: string | null
  cdnCoverUrl: string | null
  difficulty: Difficulty
  characteristic: string
  categoryId: string
  categoryCode: string
  status: MapDifficultyStatus
  scores: number
  scenarios: Partial<Record<ComplexityScenario, ScenarioMapValues>>
  deltas: Partial<Record<ComparisonScenario, ScenarioMapValues>>
  estimates: Partial<Record<EstimateScenario, ComplexityEstimateInfo>>
}

export interface ScenarioPlayValues {
  ap: number | null
  weightedAp: number | null
  position: number | null
  rank: number | null
}

export interface ComplexityScoreRow {
  userId: string
  name: string
  avatarUrl: string | null
  cdnAvatarUrl: string | null
  country: string
  accuracy: number
  scenarios: Partial<Record<ComplexityScenario, ScenarioPlayValues>>
  deltas: Partial<Record<ComparisonScenario, ScenarioPlayValues>>
}

export interface ComplexityMapLeaderboard {
  difficulty: ComplexityDifficultyRow
  rows: ComplexityScoreRow[]
}

export interface ScenarioLadderValues {
  players: number
  totalAp: number
  playersWith900: number
  playersWith1000: number
  playersWith1100: number
  playsWith1000: number
  playsWith1100: number
  topPlayAp: number
}

export interface ScenarioTotalValues {
  ap: number | null
  rank: number | null
}

export interface ComplexityPlayerRow {
  userId: string
  name: string
  avatarUrl: string | null
  cdnAvatarUrl: string | null
  country: string
  scenarios: Partial<Record<ComplexityScenario, ScenarioTotalValues>>
  deltas: Partial<Record<ComparisonScenario, ScenarioTotalValues>>
}

export interface ComplexityPlayerBoard {
  categoryId: string | null
  categoryCode: string | null
  ladders: Partial<Record<ComplexityScenario, ScenarioLadderValues>>
  rows: ComplexityPlayerRow[]
}

export interface ComplexityDifficultyParams {
  categoryId?: string
  status?: MapDifficultyStatus
  batchId?: string
  search?: string
}

export interface ComplexityPlayerParams {
  categoryId?: string
  limit?: number
  search?: string
}

export interface RaterCoefficients {
  intercept: number
  meanSlope: number
  worstSlope: number
  resetSlope: number
  dotSlope: number
  notesSlope: number
  njsSlope: number
  boardSlope: number
}

export interface RaterBoardGate {
  minScores: number
  fullScores: number
  topPlays: number
  minPlayers: number
  minPlayerPlays: number
  maxNudge: number
}

export interface ComplexityRaterSpec {
  worstShare: number
  board: RaterBoardGate
  categories: Record<string, RaterCoefficients>
  boardCategories: Record<string, RaterCoefficients>
}

export interface ComplexityRaterResponse {
  version: string
  worstBands: number[]
  rater: ComplexityRaterSpec
}

export interface ComplexityPreviewResponse {
  rater: ComplexityRaterSpec
  difficulties: ComplexityDifficultyRow[]
  players: ComplexityPlayerBoard
}

export interface ApplyScriptParams {
  reason: string
  maxStep?: number
  batchId?: string
  status?: MapDifficultyStatus
}

export interface ComplexityPreviewParams {
  categoryId?: string
  status?: MapDifficultyStatus
  playerLimit?: number
}

export interface ComplexityPlayerPlay {
  difficulty: ComplexityDifficultyRow
  accuracy: number
  scenarios: Partial<Record<ComplexityScenario, ScenarioPlayValues>>
  deltas: Partial<Record<ComparisonScenario, ScenarioPlayValues>>
}

export interface ComplexityPlayerCategory {
  categoryId: string
  categoryCode: string
  scenarios: Partial<Record<ComplexityScenario, ScenarioTotalValues>>
  deltas: Partial<Record<ComparisonScenario, ScenarioTotalValues>>
  plays: ComplexityPlayerPlay[]
}

export interface ComplexityPlayerPlays {
  userId: string
  name: string
  avatarUrl: string | null
  cdnAvatarUrl: string | null
  country: string
  categories: ComplexityPlayerCategory[]
}
