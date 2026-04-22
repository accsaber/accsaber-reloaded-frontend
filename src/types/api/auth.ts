import type { StaffRole } from '../enums'

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  role: StaffRole
}

export interface LoginRequest {
  identifier: string
  password: string
  role?: StaffRole
}

export interface RefreshRequest {
  refreshToken: string
}

export interface RequestAccessRequest {
  username: string
  email?: string
  password: string
  role: StaffRole
}
