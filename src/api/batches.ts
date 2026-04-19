import type { BatchListParams, PublicBatchResponse } from '@/types/api/batches'
import type { Page } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export function getBatches(params?: BatchListParams): Promise<Page<PublicBatchResponse>> {
  return get<Page<PublicBatchResponse>>(`/batches${buildQuery(params)}`)
}

export function getBatch(id: string): Promise<PublicBatchResponse> {
  return get<PublicBatchResponse>(`/batches/${id}`)
}
