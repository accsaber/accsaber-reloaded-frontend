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

export function recalculatePlayerStats(steamId: string, categoryId?: string): Promise<void> {
  return post<void>(`/admin/recalculate/stats/player/${steamId}${buildQuery({ categoryId })}`)
}

// --- Score backfill ---

export function backfillAllScores(): Promise<void> {
  return post<void>('/admin/import/scores/backfill-all')
}

export function backfillScoresByDifficulty(difficultyId: string): Promise<void> {
  return post<void>(`/admin/import/scores/backfill/${difficultyId}`)
}

// --- Player refresh ---

export function refreshPlayer(steamId: string): Promise<void> {
  return post<void>(`/admin/import/players/${steamId}/refresh`)
}

export function refreshAllPlayers(): Promise<void> {
  return post<void>('/admin/import/players/refresh-all')
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
