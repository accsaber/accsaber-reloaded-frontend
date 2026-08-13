import type { HealthResponse } from '@/types/api/health'
import { get } from './client'

export function getHealth(): Promise<HealthResponse> {
  return get<HealthResponse>('/health/ping')
}
