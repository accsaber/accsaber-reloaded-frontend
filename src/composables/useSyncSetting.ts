import type { SyncSettings } from '@/types/api/users'
import { dedupeRequest } from '@/utils/dedupe'
import { onBeforeUnmount, ref } from 'vue'

const RESYNC_NOTICE_MS = 6000

export function useSyncSetting(key: keyof SyncSettings) {
  const enabled = ref<boolean | null>(null)
  const saving = ref(false)
  const resyncQueued = ref(false)
  let resyncTimer: ReturnType<typeof setTimeout> | null = null

  async function fetch() {
    try {
      const { getMySyncSettings } = await import('@/api/users')
      const res = await dedupeRequest('sync-settings', getMySyncSettings)
      enabled.value = res[key] ?? true
    } catch {
      enabled.value = null
    }
  }

  async function set(next: boolean) {
    if (saving.value || enabled.value === null || enabled.value === next) return
    saving.value = true
    const wasOff = enabled.value === false
    try {
      const { putMySyncSettings } = await import('@/api/users')
      await putMySyncSettings({ [key]: next })
      enabled.value = next
      if (wasOff && next) {
        resyncQueued.value = true
        if (resyncTimer) clearTimeout(resyncTimer)
        resyncTimer = setTimeout(() => { resyncQueued.value = false }, RESYNC_NOTICE_MS)
      }
    } catch {
    } finally {
      saving.value = false
    }
  }

  function reset() {
    resyncQueued.value = false
    if (resyncTimer) clearTimeout(resyncTimer)
  }

  onBeforeUnmount(reset)

  return { enabled, saving, resyncQueued, fetch, set, reset }
}
