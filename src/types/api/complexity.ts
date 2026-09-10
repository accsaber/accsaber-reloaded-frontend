import type { Difficulty, MapDifficultyStatus } from '@/types/enums'

export type ComplexityScenario = 'CURRENT' | 'OLD_SCRIPT' | 'NEW_SCRIPT'

export type EstimateScenario = Exclude<ComplexityScenario, 'CURRENT'>

export type ComplexityDatasetKind = 'scores' | 'difficulties' | 'complexity-history'

export interface ScenarioMapValues {
  complexity: number | null
  topAp: number | null
  averageAp: number | null
  averageWeightedAp: number | null
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
  deltas: Partial<Record<EstimateScenario, ScenarioMapValues>>
  estimates: Partial<Record<EstimateScenario, ComplexityEstimateInfo>>
}

export interface ScenarioPlayValues {
  ap: number | null
  weightedAp: number | null
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
  deltas: Partial<Record<EstimateScenario, ScenarioPlayValues>>
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
  deltas: Partial<Record<EstimateScenario, ScenarioTotalValues>>
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
}

export interface HighestAverageApParams {
  scenario: ComplexityScenario
  categoryId?: string
  minScores?: number
  limit?: number
}

export interface ComplexityPlayerParams {
  categoryId?: string
  limit?: number
}
