import type { CastVoteRequest } from '@/types/api/admin'
import type { VoteListResponse, VoteResponse } from '@/types/api/maps'
import type { Page } from '@/types/pagination'
import { del, get, post } from '../client'
import { buildQuery } from '../utils'

export function getVoteActivity(params?: Record<string, unknown>): Promise<Page<VoteResponse>> {
  return get<Page<VoteResponse>>(`/ranking/maps/difficulties/votes/activity${buildQuery(params)}`)
}

export function listVotes(difficultyId: string, type?: string): Promise<VoteListResponse> {
  const query = type ? `?type=${type}` : ''
  return get<VoteListResponse>(`/ranking/maps/difficulties/${difficultyId}/votes${query}`)
}

export function listDeactivatedVotes(difficultyId: string): Promise<VoteListResponse> {
  return get<VoteListResponse>(`/ranking/maps/difficulties/${difficultyId}/votes/deactivated`)
}

export function castVote(difficultyId: string, req: CastVoteRequest): Promise<VoteResponse> {
  return post<VoteResponse>(`/ranking/maps/difficulties/${difficultyId}/votes`, req)
}

export function deactivateVote(difficultyId: string, voteId: string): Promise<void> {
  return del<void>(`/ranking/maps/difficulties/${difficultyId}/votes/${voteId}`)
}
