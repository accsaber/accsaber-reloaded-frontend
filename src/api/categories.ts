import type { CategoryResponse, ReweightRoundResponse } from '@/types/api/categories'
import { get } from './client'

export function getCategories(): Promise<CategoryResponse[]> {
  return get<CategoryResponse[]>('/categories')
}

const reweightCache = new Map<string, Promise<ReweightRoundResponse[]>>()

export function getCategoryReweights(code: string): Promise<ReweightRoundResponse[]> {
  const cached = reweightCache.get(code)
  if (cached) return cached
  const pending = get<ReweightRoundResponse[]>(`/categories/${code}/reweights`)
  pending.catch(() => reweightCache.delete(code))
  reweightCache.set(code, pending)
  return pending
}

export function getCategory(id: string): Promise<CategoryResponse> {
  return get<CategoryResponse>(`/categories/${id}`)
}
