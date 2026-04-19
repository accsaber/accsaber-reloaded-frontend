import type { BatchStatus } from '../enums'
import type { PaginationParams } from '../pagination'
import type { MapDifficultyResponse, PublicMapDifficultyResponse } from './maps'

export interface BatchResponse {
  id: string
  name: string
  description: string
  status: BatchStatus
  difficulties: MapDifficultyResponse[]
  releasedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PublicBatchResponse {
  id: string
  name: string
  description: string
  status: BatchStatus
  difficulties: PublicMapDifficultyResponse[]
  releasedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface BatchListParams extends PaginationParams {
  status?: BatchStatus
}
