export interface PublicStaffUserResponse {
  id: string
  username: string
  role: string
  userId: string
  avatarUrl: string
  active: boolean
}

export interface StaffUsersPublicParams {
  page?: number
  size?: number
  sort?: string
  active?: boolean
}
