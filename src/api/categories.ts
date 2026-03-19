import type { CategoryResponse } from '@/types/api/categories'
import { get } from './client'

export function getCategories(): Promise<CategoryResponse[]> {
  return get<CategoryResponse[]>('/categories')
}

export function getCategory(id: string): Promise<CategoryResponse> {
  return get<CategoryResponse>(`/categories/${id}`)
}
