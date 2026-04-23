import type { UserResponse } from '@/types/api/users'
import { del, patch, post } from '../client'

export function banUser(userId: string): Promise<void> {
  return post<void>(`/admin/users/${userId}/ban`)
}

export function unbanUser(userId: string): Promise<void> {
  return post<void>(`/admin/users/${userId}/unban`)
}

export interface SetCountryOverrideRequest {
  country: string
}

export function setCountryOverride(
  userId: string,
  req: SetCountryOverrideRequest,
): Promise<UserResponse> {
  return patch<UserResponse>(`/admin/users/${userId}/country`, req)
}

export function clearCountryOverride(userId: string): Promise<UserResponse> {
  return del<UserResponse>(`/admin/users/${userId}/country-override`)
}
