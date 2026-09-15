import type {
  CreateStaffUserRequest,
  ForceChangePasswordRequest,
  LinkUserRequest,
  OAuthLinkRequest,
  StaffOAuthLinkResponse,
  StaffUserResponse,
  UpdateStaffRoleRequest,
  UpdateStaffStatusRequest,
} from '@/types/api/admin'
import type { Page, PaginationParams } from '@/types/pagination'
import { del, get, patch, post } from '../client'
import { buildQuery } from '../utils'

import type { StaffUserStatus } from '@/types/enums'

export function getStaffUsers(
  params?: PaginationParams & { status?: StaffUserStatus; active?: boolean },
): Promise<Page<StaffUserResponse>> {
  return get<Page<StaffUserResponse>>(`/staff/users${buildQuery(params)}`)
}

export function createStaffUser(req: CreateStaffUserRequest): Promise<StaffUserResponse> {
  return post<StaffUserResponse>('/staff/users', req)
}

export function updateStaffRole(
  id: string,
  req: UpdateStaffRoleRequest,
): Promise<StaffUserResponse> {
  return patch<StaffUserResponse>(`/staff/users/${id}/role`, req)
}

export function updateStaffStatus(
  id: string,
  req: UpdateStaffStatusRequest,
): Promise<StaffUserResponse> {
  return patch<StaffUserResponse>(`/staff/users/${id}/status`, req)
}

export function setStaffActive(id: string, active: boolean): Promise<StaffUserResponse> {
  return patch<StaffUserResponse>(`/staff/users/${id}/active${buildQuery({ active })}`)
}

export function linkOAuth(
  id: string,
  req: OAuthLinkRequest,
): Promise<StaffOAuthLinkResponse> {
  return post<StaffOAuthLinkResponse>(`/staff/users/${id}/oauth`, req)
}

export function unlinkOAuth(id: string, linkId: string): Promise<void> {
  return del<void>(`/staff/users/${id}/oauth/${linkId}`)
}

export function linkUser(id: string, req: LinkUserRequest): Promise<StaffUserResponse> {
  return patch<StaffUserResponse>(`/staff/users/${id}/link-user`, req)
}

export function forceChangePassword(id: string, req: ForceChangePasswordRequest): Promise<void> {
  return patch<void>(`/staff/users/${id}/password`, req)
}

export function deleteStaffUser(id: string): Promise<void> {
  return del<void>(`/staff/users/${id}`)
}
