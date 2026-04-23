import { patch, post } from '../client'

export interface BadgeResponse {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  active: boolean
  createdAt: string
}

export interface UserBadgeResponse {
  id: string
  userId: string
  badgeId: string
  badge: BadgeResponse
  reason: string | null
  awardedAt: string
}

export interface CreateBadgeRequest {
  name: string
  description?: string
  imageUrl?: string
}

export interface AwardBadgeRequest {
  userId: string
  badgeId: string
  reason?: string
}

export function createBadge(req: CreateBadgeRequest): Promise<BadgeResponse> {
  return post<BadgeResponse>('/admin/badges', req)
}

export function deactivateBadge(id: string): Promise<BadgeResponse> {
  return patch<BadgeResponse>(`/admin/badges/${id}`)
}

export function awardBadge(req: AwardBadgeRequest): Promise<UserBadgeResponse> {
  return post<UserBadgeResponse>('/admin/badges/award', req)
}
