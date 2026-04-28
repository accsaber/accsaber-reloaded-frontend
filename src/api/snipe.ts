import type { SnipeComparisonResponse } from '@/types/api/snipe'
import type { Page, PaginationParams } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export interface SnipeListParams extends Pick<PaginationParams, 'page' | 'size'> {
  category?: string
}

export function getClosestScores(
  sniperId: string,
  targetId: string,
  params?: SnipeListParams,
): Promise<Page<SnipeComparisonResponse>> {
  return get<Page<SnipeComparisonResponse>>(
    `/users/${sniperId}/closest-to/${targetId}${buildQuery(params)}`,
  )
}

export function buildSnipePlaylistUrl(
  sniperId: string,
  targetId: string,
  options: { size?: number; category?: string } = {},
): string {
  const base = import.meta.env.VITE_API_BASE
  const root = `${base}/playlists/snipe/${sniperId}/${targetId}`
  const { size, category } = options
  if (category) return `${root}/${size ?? 0}/${category}`
  if (size != null) return `${root}/${size}`
  return root
}
