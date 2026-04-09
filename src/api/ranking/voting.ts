import type { CastVoteRequest } from '@/types/api/admin'
import type { VoteListResponse, VoteResponse } from '@/types/api/maps'
import { del, get, post } from '../client'

export function listVotes(difficultyId: string): Promise<VoteListResponse> {
  return get<VoteListResponse>(`/ranking/maps/difficulties/${difficultyId}/votes`)
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
