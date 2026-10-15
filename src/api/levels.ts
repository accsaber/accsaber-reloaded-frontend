import type { LevelThresholdResponse } from '@/types/api/level-thresholds'
import { get } from './client'

export function getLevelThresholds(): Promise<LevelThresholdResponse[]> {
  return get<LevelThresholdResponse[]>('/levels')
}
