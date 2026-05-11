import type {
  LevelThresholdResponse,
  UpsertLevelThresholdRequest,
} from '@/types/api/level-thresholds'
import { del, get, put } from '../client'

export function getLevelThresholds(): Promise<LevelThresholdResponse[]> {
  return get<LevelThresholdResponse[]>('/admin/level-thresholds')
}

export function getLevelThreshold(level: number): Promise<LevelThresholdResponse> {
  return get<LevelThresholdResponse>(`/admin/level-thresholds/${level}`)
}

export function upsertLevelThreshold(
  level: number,
  req: UpsertLevelThresholdRequest,
): Promise<LevelThresholdResponse> {
  return put<LevelThresholdResponse>(`/admin/level-thresholds/${level}`, req)
}

export function deleteLevelThreshold(level: number): Promise<void> {
  return del<void>(`/admin/level-thresholds/${level}`)
}
