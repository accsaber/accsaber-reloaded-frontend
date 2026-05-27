import { getUserSupporter } from '@/api/supporters'
import type { SupporterStateResponse } from '@/types/api/supporters'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useSupporterStore = defineStore('supporters', () => {
  const states = ref<Record<string, SupporterStateResponse>>({})
  const pending = new Map<string, Promise<SupporterStateResponse | null>>()

  function get(userId: string): SupporterStateResponse | null {
    return states.value[userId] ?? null
  }

  async function fetch(userId: string): Promise<SupporterStateResponse | null> {
    if (states.value[userId]) return states.value[userId]
    const existing = pending.get(userId)
    if (existing) return existing
    const p = getUserSupporter(userId)
      .then((res) => {
        states.value[userId] = res
        return res
      })
      .catch((err) => {
        console.warn(`[supporters] failed to load state for user ${userId}:`, err)
        return null
      })
      .finally(() => {
        pending.delete(userId)
      })
    pending.set(userId, p)
    return p
  }

  function invalidate(userId: string): void {
    delete states.value[userId]
  }

  return {
    states: computed(() => states.value),
    get,
    fetch,
    invalidate,
  }
})
