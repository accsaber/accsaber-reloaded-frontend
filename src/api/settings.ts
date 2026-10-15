import type { SettingGroup, SettingsBag } from '@/types/api/settings'
import { get, put } from './client'

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
