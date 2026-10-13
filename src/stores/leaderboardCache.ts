import { defineStore } from 'pinia'

const MAX_ENTRIES = 30

export const useLeaderboardCacheStore = defineStore('leaderboardCache', () => {
  const cache = new Map<string, unknown>()

  function buildKey(params: Record<string, unknown>): string {
    return Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k] ?? ''}`)
      .join('&')
  }

  function getCached<T>(params: Record<string, unknown>): T | null {
    return (cache.get(buildKey(params)) as T | undefined) ?? null
  }

  function setCache(params: Record<string, unknown>, data: unknown) {
    const key = buildKey(params)
    cache.delete(key)
    cache.set(key, data)
    if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!)
  }

  return { getCached, setCache }
})
