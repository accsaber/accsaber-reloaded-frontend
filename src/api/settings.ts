import type { SettingGroup, SettingsBag } from '@/types/api/settings'
import { get, put } from './client'

export function getMySettings(): Promise<SettingsBag> {
  return get<SettingsBag>('/users/me/settings')
}

export function getMySettingsGroup<T extends SettingsBag = SettingsBag>(
  group: SettingGroup,
): Promise<T> {
  return get<T>(`/users/me/settings/${group}`)
}

export function patchMySettingsGroup<T extends SettingsBag = SettingsBag>(
  group: SettingGroup,
  patch: Partial<T>,
): Promise<T> {
  return put<T>(`/users/me/settings/${group}`, patch)
}

export function getUserSettingsGroup<T extends SettingsBag = SettingsBag>(
  userId: string,
  group: SettingGroup,
): Promise<T> {
  return get<T>(`/users/${userId}/settings/${group}`)
}
