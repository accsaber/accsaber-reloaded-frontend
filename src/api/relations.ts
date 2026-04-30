import type {
  MyRelationsParams,
  UserRelationRequest,
  UserRelationResponse,
  UserRelationsParams,
} from '@/types/api/relations'
import type { Page } from '@/types/pagination'
import { del, get, post } from './client'
import { buildQuery } from './utils'

export function getMyRelations(
  params?: MyRelationsParams,
): Promise<Page<UserRelationResponse>> {
  return get<Page<UserRelationResponse>>(`/users/me/relations${buildQuery(params)}`)
}

export function getUserRelations(
  userId: string,
  params?: UserRelationsParams,
): Promise<Page<UserRelationResponse>> {
  return get<Page<UserRelationResponse>>(`/users/${userId}/relations${buildQuery(params)}`)
}

export function createRelation(
  body: UserRelationRequest,
): Promise<UserRelationResponse> {
  return post<UserRelationResponse>('/users/me/relations', body)
}

export function deleteRelation(relationId: string): Promise<void> {
  return del<void>(`/users/me/relations/${relationId}`)
}
