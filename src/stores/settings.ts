import type {
  AppearanceSettings,
  ClanSettings,
  PrivacySettings,
  SettingGroup,
  SettingsBag,
} from '@/types/api/settings'
import { DEFAULT_SCORE_ROW_FIELDS } from '@/utils/scoreRowFields'
import { defineStore } from 'pinia'
import { ref, type Ref } from 'vue'

const api = () => import('@/api/settings')

const PRIVACY_DEFAULTS: PrivacySettings = {
  'privacy.followingVisibility': 'public',
  'privacy.rivalsVisibility': 'public',
  'privacy.showOnlineStatus': false,
}

const APPEARANCE_DEFAULTS: AppearanceSettings = {
  'appearance.theme': '',
  'appearance.colorScheme': '',
  'appearance.primaryReplayService': 'beatleader',
  'appearance.fallbackReplayService': null,
  'appearance.complexityNumberStyle': 'colored',
  'appearance.complexityBar': true,
  'appearance.scoreRowFields': [...DEFAULT_SCORE_ROW_FIELDS],
  'appearance.hideReloadedProfileFeatures': false,
  'appearance.showStatisticsChart': false,
  'appearance.clanChatBubble': true,
}

const CLAN_DEFAULTS: ClanSettings = {
  'clans.warParticipation': true,
}

function settingsGroup<T extends SettingsBag>(group: SettingGroup, defaults: T, saveError: string) {
  const values = ref({ ...defaults }) as Ref<T>
  const loaded = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function fetch(): Promise<void> {
    try {
      const res = await (await api()).getMySettingsGroup<T>(group)
      values.value = { ...defaults, ...res }
      loaded.value = true
    } catch {
      loaded.value = false
    }
  }

  async function update<K extends keyof T>(key: K, value: T[K]): Promise<boolean> {
    if (saving.value) return false
    const previous = values.value[key]
    values.value = { ...values.value, [key]: value }
    saving.value = true
    error.value = null
    try {
      const patch: Partial<T> = {}
      patch[key] = value
      const fresh = await (await api()).patchMySettingsGroup<T>(group, patch)
      values.value = { ...defaults, ...fresh }
      return true
    } catch {
      values.value = { ...values.value, [key]: previous }
      error.value = saveError
      return false
    } finally {
      saving.value = false
    }
  }

  function reset() {
    values.value = { ...defaults }
    loaded.value = false
    error.value = null
  }

  return { values, loaded, saving, error, fetch, update, reset }
}

export const useSettingsStore = defineStore('settings', () => {
  const privacy = settingsGroup('privacy', PRIVACY_DEFAULTS, "Couldn't save privacy setting.")
  const appearance = settingsGroup('appearance', APPEARANCE_DEFAULTS, "Couldn't save appearance setting.")
  const clans = settingsGroup('clans', CLAN_DEFAULTS, "Couldn't save clan setting.")

  function reset() {
    privacy.reset()
    appearance.reset()
    clans.reset()
  }

  async function fetchGroup<T extends SettingsBag>(group: SettingGroup): Promise<T | null> {
    try {
      return await (await api()).getMySettingsGroup<T>(group)
    } catch {
      return null
    }
  }

  return {
    privacy: privacy.values,
    privacyLoaded: privacy.loaded,
    privacySaving: privacy.saving,
    privacyError: privacy.error,
    fetchPrivacy: privacy.fetch,
    updatePrivacy: privacy.update,
    appearance: appearance.values,
    appearanceLoaded: appearance.loaded,
    appearanceSaving: appearance.saving,
    appearanceError: appearance.error,
    fetchAppearance: appearance.fetch,
    updateAppearance: appearance.update,
    clans: clans.values,
    clansLoaded: clans.loaded,
    clansSaving: clans.saving,
    clansError: clans.error,
    fetchClans: clans.fetch,
    updateClans: clans.update,
    fetchGroup,
    reset,
  }
})
