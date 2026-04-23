import type { UserResponse } from '@/types/api/users'
import { get, post } from '../client'
import { buildQuery } from '../utils'

// --- AP recalculation ---

export function recalculateApByDifficulty(difficultyId: string): Promise<void> {
  return post<void>(`/admin/recalculate/ap/difficulty/${difficultyId}`)
}

export function recalculateRawAp(): Promise<void> {
  return post<void>('/admin/recalculate/ap/raw')
}

export function recalculateWeightedAp(): Promise<void> {
  return post<void>('/admin/recalculate/ap/weighted')
}

export function recalculateAllAp(): Promise<void> {
  return post<void>('/admin/recalculate/ap/all')
}

// --- XP recalculation ---

export function recalculateScoreXp(): Promise<void> {
  return post<void>('/admin/recalculate/xp/scores')
}

export function recalculateXpSums(): Promise<void> {
  return post<void>('/admin/recalculate/xp/sum')
}

// --- Stats recalculation ---

export function recalculatePlayerStats(userId: string, categoryId?: string): Promise<void> {
  return post<void>(`/admin/recalculate/stats/player/${userId}${buildQuery({ categoryId })}`)
}

// --- Score backfill ---

export function backfillAllScores(): Promise<void> {
  return post<void>('/admin/import/scores/backfill-all')
}

export function backfillScoresByDifficulty(difficultyId: string): Promise<void> {
  return post<void>(`/admin/import/scores/backfill/${difficultyId}`)
}

export function backfillScoresByUser(userId: string): Promise<void> {
  return post<void>(`/admin/import/scores/backfill-user/${userId}`)
}

export function backfillScoresByUsers(userIds: string[]): Promise<void> {
  return post<void>('/admin/import/scores/backfill-users', userIds)
}

// --- Score removal ---

export interface RemoveScoreParams {
  userId: string
  mapDifficultyId: string
  reason?: string
}

export function removeScore(params: RemoveScoreParams): Promise<void> {
  return post<void>(`/admin/recalculate/scores/remove${buildQuery(params)}`)
}

// --- Player refresh ---

export function refreshPlayer(userId: string): Promise<UserResponse> {
  return post<UserResponse>(`/admin/users/${userId}/refresh`)
}

export function refreshAllPlayers(): Promise<void> {
  return post<void>('/admin/users/refresh')
}

// --- WebSocket management ---

export interface WsStatus {
  [platform: string]: Record<string, unknown>
}

export function getWsStatus(): Promise<WsStatus> {
  return get<WsStatus>('/admin/ws/status')
}

export function reconnectWs(platform: 'beatleader' | 'scoresaber'): Promise<void> {
  return post<void>(`/admin/ws/reconnect${buildQuery({ platform })}`)
}
