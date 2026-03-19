import type { BatchListParams, BatchResponse } from '@/types/api/batches'
import type { Page } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export function getBatches(params?: BatchListParams): Promise<Page<BatchResponse>> {
  return get<Page<BatchResponse>>(`/batches${buildQuery(params)}`)
}

export function getBatch(id: string): Promise<BatchResponse> {
  return get<BatchResponse>(`/batches/${id}`)
}
