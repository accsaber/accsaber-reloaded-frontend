import type { SnipeComparisonResponse, SnipeListParams } from '@/types/api/snipe'
import type { Page } from '@/types/pagination'
import { get } from './client'
import { buildQuery } from './utils'

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
  options: Omit<SnipeListParams, 'page'> = {},
): string {
  const base = import.meta.env.VITE_API_BASE
  const root = `${base}/playlists/snipe/${sniperId}/${targetId}`
  const { size, category, sort, direction, unplayed } = options
  const query = buildQuery({ sort, direction, unplayed })
  if (category) return `${root}/${size ?? 0}/${category}${query}`
  if (size != null) return `${root}/${size}${query}`
  return `${root}${query}`
}
