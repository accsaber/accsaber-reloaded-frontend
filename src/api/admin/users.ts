import { post } from '../client'

export function banUser(steamId: string): Promise<void> {
  return post<void>(`/admin/users/${steamId}/ban`)
}

export function unbanUser(steamId: string): Promise<void> {
  return post<void>(`/admin/users/${steamId}/unban`)
}
