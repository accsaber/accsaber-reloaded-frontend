import { post } from '../client'

export function banUser(userId: string): Promise<void> {
  return post<void>(`/admin/users/${userId}/ban`)
}

export function unbanUser(userId: string): Promise<void> {
  return post<void>(`/admin/users/${userId}/unban`)
}
