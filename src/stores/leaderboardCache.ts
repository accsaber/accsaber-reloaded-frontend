import { defineStore } from 'pinia'
import { ref } from 'vue'

interface CachedPage {
  data: unknown
  fetchedAt: number
}

export const useLeaderboardCacheStore = defineStore('leaderboardCache', () => {
  const cache = ref<Map<string, CachedPage>>(new Map())

  function buildKey(params: Record<string, unknown>): string {
    return Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k] ?? ''}`)
      .join('&')
  }

  function getCached<T>(params: Record<string, unknown>): T | null {
    const entry = cache.value.get(buildKey(params))
    return entry ? (entry.data as T) : null
  }

  function setCache(params: Record<string, unknown>, data: unknown) {
    const key = buildKey(params)
    cache.value.set(key, { data, fetchedAt: Date.now() })
    if (cache.value.size > 30) {
      const oldest = [...cache.value.entries()].sort(
        (a, b) => a[1].fetchedAt - b[1].fetchedAt,
      )
      cache.value.delete(oldest[0][0])
    }
  }

  function clear() {
    cache.value.clear()
  }

  return { getCached, setCache, clear }
})
