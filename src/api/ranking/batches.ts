import type { CreateBatchRequest, UpdateBatchStatusRequest } from '@/types/api/admin'
import type { BatchResponse } from '@/types/api/batches'
import { del, patch, post } from '../client'

export function createBatch(req: CreateBatchRequest): Promise<BatchResponse> {
  return post<BatchResponse>('/ranking/batches', req)
}

export function updateBatchStatus(
  batchId: string,
  req: UpdateBatchStatusRequest,
): Promise<BatchResponse> {
  return patch<BatchResponse>(`/ranking/batches/${batchId}/status`, req)
}

export function addDifficultyToBatch(
  batchId: string,
  difficultyId: string,
): Promise<BatchResponse> {
  return post<BatchResponse>(`/ranking/batches/${batchId}/difficulties/${difficultyId}`)
}

export function removeDifficultyFromBatch(
  batchId: string,
  difficultyId: string,
): Promise<void> {
  return del<void>(`/ranking/batches/${batchId}/difficulties/${difficultyId}`)
}

export function releaseBatch(batchId: string): Promise<BatchResponse> {
  return post<BatchResponse>(`/ranking/batches/${batchId}/release`)
}
