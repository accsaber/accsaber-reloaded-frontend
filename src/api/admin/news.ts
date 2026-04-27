import type {
  CreateNewsRequest,
  NewsResponse,
  StaffNewsListParams,
  UpdateNewsRequest,
} from '@/types/api/news'
import type { Page } from '@/types/pagination'
import { del, get, patch, post } from '../client'
import { invalidateNewsCache } from '../news'
import { buildQuery } from '../utils'

export function listAllNews(params?: StaffNewsListParams): Promise<Page<NewsResponse>> {
  return get<Page<NewsResponse>>(`/admin/news${buildQuery(params)}`)
}

export function getAdminNews(id: string): Promise<NewsResponse> {
  return get<NewsResponse>(`/admin/news/${id}`)
}

export async function createAdminNews(req: CreateNewsRequest): Promise<NewsResponse> {
  const res = await post<NewsResponse>('/admin/news', req)
  invalidateNewsCache()
  return res
}

export async function updateAdminNews(id: string, req: UpdateNewsRequest): Promise<NewsResponse> {
  const res = await patch<NewsResponse>(`/admin/news/${id}`, req)
  invalidateNewsCache()
  return res
}

export async function deleteAdminNews(id: string, hard = false): Promise<void> {
  await del<void>(`/admin/news/${id}${hard ? '?hard=true' : ''}`)
  invalidateNewsCache()
}
