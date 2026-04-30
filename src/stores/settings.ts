import {
  getMySettingsGroup as apiGetGroup,
  patchMySettingsGroup as apiPatchGroup,
} from '@/api/settings'
import type {
  PrivacySettings,
  SettingGroup,
  SettingsBag,
  Visibility,
} from '@/types/api/settings'
import { defineStore } from 'pinia'
import { ref } from 'vue'

const PRIVACY_DEFAULTS: PrivacySettings = {
  'privacy.followingVisibility': 'public',
  'privacy.rivalsVisibility': 'public',
}

export const useSettingsStore = defineStore('settings', () => {
  const privacy = ref<PrivacySettings>({ ...PRIVACY_DEFAULTS })
  const privacyLoaded = ref(false)
  const privacySaving = ref(false)
  const privacyError = ref<string | null>(null)

  async function fetchPrivacy(): Promise<void> {
    try {
      const res = await apiGetGroup<PrivacySettings>('privacy')
      privacy.value = { ...PRIVACY_DEFAULTS, ...res }
      privacyLoaded.value = true
    } catch {
      privacyLoaded.value = false
    }
  }

  async function updatePrivacy(
    key: keyof PrivacySettings,
    value: Visibility,
  ): Promise<boolean> {
    const previous = privacy.value[key]
    privacy.value = { ...privacy.value, [key]: value }
    privacySaving.value = true
    privacyError.value = null
    try {
      const fresh = await apiPatchGroup<PrivacySettings>('privacy', { [key]: value })
      privacy.value = { ...PRIVACY_DEFAULTS, ...fresh }
      return true
    } catch {
      privacy.value = { ...privacy.value, [key]: previous }
      privacyError.value = "Couldn't save privacy setting."
      return false
    } finally {
      privacySaving.value = false
    }
  }

  function reset() {
    privacy.value = { ...PRIVACY_DEFAULTS }
    privacyLoaded.value = false
    privacyError.value = null
  }

  async function fetchGroup<T extends SettingsBag>(group: SettingGroup): Promise<T | null> {
    try {
      return await apiGetGroup<T>(group)
    } catch {
      return null
    }
  }

  return {
    privacy,
    privacyLoaded,
    privacySaving,
    privacyError,
    fetchPrivacy,
    updatePrivacy,
    fetchGroup,
    reset,
  }
})
