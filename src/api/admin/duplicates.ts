import type {
  CreateDuplicateLinkRequest,
  DuplicateCandidateResponse,
  DuplicateLinkResponse,
  MergeDuplicateRequest,
} from '@/types/api/admin'
import { del, get, post } from '../client'

export function getDuplicateCandidates(): Promise<DuplicateCandidateResponse[]> {
  return get<DuplicateCandidateResponse[]>('/admin/users/duplicates')
}

export function getDuplicateLinks(): Promise<DuplicateLinkResponse[]> {
  return get<DuplicateLinkResponse[]>('/admin/users/duplicates/links')
}

export function createDuplicateLink(req: CreateDuplicateLinkRequest): Promise<DuplicateLinkResponse> {
  return post<DuplicateLinkResponse>('/admin/users/duplicates/links', req)
}

export function deleteDuplicateLink(linkId: string): Promise<void> {
  return del<void>(`/admin/users/duplicates/links/${linkId}`)
}

export function mergeDuplicate(req: MergeDuplicateRequest): Promise<DuplicateLinkResponse> {
  return post<DuplicateLinkResponse>('/admin/users/duplicates/merge', req)
}

export function unmergeDuplicate(linkId: string): Promise<DuplicateLinkResponse> {
  return post<DuplicateLinkResponse>(`/admin/users/duplicates/unmerge/${linkId}`)
}

export function mergeAllUnmerged(): Promise<DuplicateLinkResponse[]> {
  return post<DuplicateLinkResponse[]>('/admin/users/duplicates/merge-all')
}
