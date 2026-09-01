import type { SnipeComparisonResponse, SnipeSort } from '@/types/api/snipe'
import type { SortDirection } from '@/types/display'
import type { Page, PaginationParams } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

export interface SnipeListParams extends Pick<PaginationParams, 'page' | 'size'> {
  category?: string
  sort?: SnipeSort
  direction?: SortDirection
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
  options: {
    size?: number
    category?: string
    sort?: SnipeSort
    direction?: SortDirection
  } = {},
): string {
  const base = import.meta.env.VITE_API_BASE
  const root = `${base}/playlists/snipe/${sniperId}/${targetId}`
  const { size, category, sort, direction } = options
  const query = buildQuery({ sort, direction })
  if (category) return `${root}/${size ?? 0}/${category}${query}`
  if (size != null) return `${root}/${size}${query}`
  return `${root}${query}`
}
