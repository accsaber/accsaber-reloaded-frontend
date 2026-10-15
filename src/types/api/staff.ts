import type { StaffRole } from '../enums'

export interface PublicStaffUserResponse {
  id: string
  username?: string
  role: StaffRole
  userId?: string
  avatarUrl?: string
  cdnAvatarUrl?: string
  active: boolean
}
