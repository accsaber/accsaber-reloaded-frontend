import type {
  CreateNewsRequest,
  NewsResponse,
  StaffNewsListParams,
  UpdateNewsRequest,
} from '@/types/api/news'
import type { Page } from '@/types/pagination'
import { get, patch, post } from '../client'
import { invalidateNewsCache } from '../news'
import { buildQuery } from '../utils'

export function listMyNews(params?: StaffNewsListParams): Promise<Page<NewsResponse>> {
  return get<Page<NewsResponse>>(`/ranking/news/mine${buildQuery(params)}`)
}

export function getRankingNews(id: string): Promise<NewsResponse> {
  return get<NewsResponse>(`/ranking/news/${id}`)
}

export async function createRankingNews(req: CreateNewsRequest): Promise<NewsResponse> {
  const res = await post<NewsResponse>('/ranking/news', req)
  invalidateNewsCache()
  return res
}

export async function updateRankingNews(id: string, req: UpdateNewsRequest): Promise<NewsResponse> {
  const res = await patch<NewsResponse>(`/ranking/news/${id}`, req)
  invalidateNewsCache()
  return res
}
