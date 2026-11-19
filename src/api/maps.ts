import type { ChatMessageResponse, SendChatMessageRequest } from '@/types/api/chat'
import type {
  AutoCriteriaCheckResponse,
  CriteriaCheck,
  CriteriaCheckResult,
  CriteriaCheckSource,
  DifficultyListParams,
  DifficultyScoreParams,
  MapComplexityHistoryResponse,
  MapDifficultyStatisticsResponse,
  MapSubscriptionResponse,
  PublicMapDifficultyResponse,
  PublicMapResponse,
  SuggestMapRequest,
  VoteListResponse,
} from '@/types/api/maps'
import type { ScoreResponse } from '@/types/api/users'
import type { Page, PaginationParams } from '@/types/pagination'
import { del, get, post, postMultipart, put } from './client'
import { isUuid, slugToDifficulty } from '@/utils/mapRoute'
import { buildQuery } from './utils'

export function getMap(mapId: string): Promise<PublicMapResponse> {
  return get<PublicMapResponse>(`/maps/${mapId}`)
}

export function getMapByCode(
  code: string,
  params?: { difficulty?: string; characteristic?: string },
): Promise<PublicMapResponse> {
  return get<PublicMapResponse>(`/maps/by-code/${code}${buildQuery(params)}`)
}

export function getMapByRef(
  ref: string,
  difficultySlug?: string,
  characteristic = 'Standard',
): Promise<PublicMapResponse> {
  if (isUuid(ref)) return getMap(ref)
  return getMapByCode(
    ref,
    difficultySlug ? { difficulty: slugToDifficulty(difficultySlug), characteristic } : undefined,
  )
}

export function getDifficulty(difficultyId: string): Promise<PublicMapDifficultyResponse> {
  return get<PublicMapDifficultyResponse>(`/maps/difficulties/${difficultyId}`)
}

export function getDifficulties(params?: DifficultyListParams): Promise<Page<PublicMapDifficultyResponse>> {
  return get<Page<PublicMapDifficultyResponse>>(`/maps/difficulties${buildQuery(params)}`)
}

export function getDifficultyScores(
  difficultyId: string,
  params?: DifficultyScoreParams,
): Promise<Page<ScoreResponse>> {
  return get<Page<ScoreResponse>>(`/maps/difficulties/${difficultyId}/scores${buildQuery(params)}`)
}

export function getDifficultyStatisticsHistoric(
  difficultyId: string,
  params: { amount: number; unit: string },
): Promise<MapDifficultyStatisticsResponse[]> {
  return get<MapDifficultyStatisticsResponse[]>(
    `/maps/difficulties/${difficultyId}/statistics/historic${buildQuery(params)}`,
  )
}

export function getComplexityHistory(mapId: string): Promise<MapComplexityHistoryResponse[]> {
  return get<MapComplexityHistoryResponse[]>(`/maps/${mapId}/complexity-history`)
}

export function getDifficultyVotes(difficultyId: string): Promise<VoteListResponse> {
  return get<VoteListResponse>(`/maps/difficulties/${difficultyId}/votes`)
}

export function getDifficultyComments(
  difficultyId: string,
  params: PaginationParams,
): Promise<Page<ChatMessageResponse>> {
  return get<Page<ChatMessageResponse>>(`/maps/difficulties/${difficultyId}/comments${buildQuery(params)}`)
}

export function postDifficultyComment(
  difficultyId: string,
  req: SendChatMessageRequest,
): Promise<ChatMessageResponse> {
  return post<ChatMessageResponse>(`/maps/difficulties/${difficultyId}/comments`, req)
}

export function getDifficultySubscription(difficultyId: string): Promise<MapSubscriptionResponse> {
  return get<MapSubscriptionResponse>(`/maps/difficulties/${difficultyId}/subscription`)
}

export function setDifficultySubscription(difficultyId: string, subscribed: boolean): Promise<void> {
  const path = `/maps/difficulties/${difficultyId}/subscription`
  return subscribed ? put<void>(path) : del<void>(path)
}

export function suggestMap(req: SuggestMapRequest): Promise<PublicMapDifficultyResponse> {
  return post<PublicMapDifficultyResponse>('/maps/suggestions', req)
}

export function withdrawSuggestion(difficultyId: string): Promise<void> {
  return del<void>(`/maps/suggestions/${difficultyId}`)
}

export function checkCriteria(source: CriteriaCheckSource, checks: CriteriaCheck[]): Promise<CriteriaCheckResult[]> {
  if ('songHash' in source) {
    return post<CriteriaCheckResult[]>('/maps/criteria-check', { songHash: source.songHash, checks })
  }
  const form = new FormData()
  form.append('file', source.zip, 'map.zip')
  form.append('request', new Blob([JSON.stringify({ checks })], { type: 'application/json' }))
  return postMultipart<CriteriaCheckResult[]>('/maps/criteria-check', form)
}

export function refreshCriteriaCheck(difficultyId: string): Promise<AutoCriteriaCheckResponse> {
  return post<AutoCriteriaCheckResponse>(`/maps/difficulties/${difficultyId}/criteria-check`)
}
