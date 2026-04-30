export type Visibility = 'public' | 'followers_only' | 'private'

export type SettingGroup = 'privacy' | 'appearance'

export type SettingKey =
  | 'privacy.followingVisibility'
  | 'privacy.rivalsVisibility'
  | 'appearance.theme'
  | 'appearance.colorScheme'

export type SettingsBag = Record<string, unknown>

export interface PrivacySettings extends SettingsBag {
  'privacy.followingVisibility': Visibility
  'privacy.rivalsVisibility': Visibility
}

export interface AppearanceSettings extends SettingsBag {
  'appearance.theme': string
  'appearance.colorScheme': string
}
