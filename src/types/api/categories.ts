import type { CurveType, Difficulty } from '../enums'

export interface CategoryResponse {
  id: string
  code: string
  name: string
  description: string
  scoreCurve: CurveResponse
  weightCurve: CurveResponse
  countForOverall: boolean
}

export interface ReweightRoundMapChange {
  mapId: string
  mapDifficultyId: string
  songName: string
  difficulty: Difficulty
  from: number
  to: number
}

export interface ReweightRoundResponse {
  id: string
  at: string
  categoryCode: string
  reason: string | null
  mapCount: number
  buffs: number
  nerfs: number
  maps: ReweightRoundMapChange[] | null
}

export interface CurvePointResponse {
  x: number
  y: number
}

export interface CurveResponse {
  id: string
  name: string
  type: CurveType
  formula: string | null
  points: CurvePointResponse[] | null
  xParameterName: string | null
  xParameterValue: number | null
  yParameterName: string | null
  yParameterValue: number | null
  zParameterName: string | null
  zParameterValue: number | null
  scale: number | null
  shift: number | null
}
