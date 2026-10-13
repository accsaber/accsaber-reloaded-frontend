import type { HealthResponse } from '@/types/api/health'
import { get } from './client'

let cached: Promise<HealthResponse> | null = null

export function getHealth(): Promise<HealthResponse> {
  cached ??= get<HealthResponse>('/health/ping').catch((error: unknown) => {
    cached = null
    throw error
  })
  return cached
}
