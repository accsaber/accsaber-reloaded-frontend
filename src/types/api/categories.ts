import type { CurveType } from '../enums'

export interface CategoryResponse {
  id: string
  code: string
  name: string
  description: string
  scoreCurve: CurveResponse
  weightCurve: CurveResponse
  countForOverall: boolean
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
