import type { AuthResponse, LoginRequest, RefreshRequest } from '@/types/api/auth'
import { post } from './client'

export function login(req: LoginRequest): Promise<AuthResponse> {
  return post<AuthResponse>('/staff/auth/login', req)
}

export function refreshToken(req: RefreshRequest): Promise<AuthResponse> {
  return post<AuthResponse>('/staff/auth/refresh', req)
}

export function logout(): Promise<void> {
  return post<void>('/staff/auth/logout')
}
