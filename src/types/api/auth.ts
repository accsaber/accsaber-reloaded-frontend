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
}

export interface RefreshRequest {
  refreshToken: string
}
