import type { PaginationParams } from '../pagination'

export type UserRelationType = 'follower' | 'rival' | 'blocked'
export type RelationDirection = 'outgoing' | 'incoming'
export type ScoreRelationType = Exclude<UserRelationType, 'blocked'>

export interface UserRelationRequest {
  targetUserId: string
  type: UserRelationType
}

export interface UserRelationResponse {
  id: string
  userId: string
  targetUserId: string
  targetName: string
  targetAvatarUrl: string | null
  targetCountry: string | null
  type: UserRelationType
  createdAt: string
}

export interface UserRelationCounts {
  followingCount?: number
  followerCount: number
  rivalCount?: number
  rivaledByCount: number
  blockedCount?: number
}

export interface MyRelationsParams extends PaginationParams {
  type?: UserRelationType
}

export interface UserRelationsParams extends PaginationParams {
  type?: UserRelationType
  direction?: RelationDirection
}

export interface RelationScoresParams extends PaginationParams {
  type?: ScoreRelationType
  categoryId?: string
  search?: string
}
