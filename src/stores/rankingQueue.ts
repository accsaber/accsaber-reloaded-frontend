import type { MapDifficultyResponse } from '@/types/api/maps'
import type { MapDifficultyStatus } from '@/types/enums'
import { defineStore } from 'pinia'
import { ref } from 'vue'

interface CachedPage {
  content: MapDifficultyResponse[]
  totalPages: number
  totalElements: number
  fetchedAt: number
  paramsKey: string
}

export const useRankingQueueStore = defineStore('rankingQueue', () => {
  const cache = ref<Map<string, CachedPage>>(new Map())

  function buildKey(params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k] ?? ''}`)
      .join('&')
    return sorted
  }

  function getCached(params: Record<string, unknown>): CachedPage | null {
    const key = buildKey(params)
    return cache.value.get(key) ?? null
  }

  function setCache(
    params: Record<string, unknown>,
    content: MapDifficultyResponse[],
    totalPages: number,
    totalElements: number,
  ) {
    const key = buildKey(params)
    cache.value.set(key, {
      content,
      totalPages,
      totalElements,
      fetchedAt: Date.now(),
      paramsKey: key,
    })
    if (cache.value.size > 20) {
      const oldest = [...cache.value.entries()].sort(
        (a, b) => a[1].fetchedAt - b[1].fetchedAt,
      )
      cache.value.delete(oldest[0][0])
    }
  }

  function invalidateStatus(status: MapDifficultyStatus) {
    for (const [key] of cache.value) {
      if (key.includes(`status=${status}`)) {
        cache.value.delete(key)
      }
    }
  }

  function clear() {
    cache.value.clear()
  }

  return { getCached, setCache, invalidateStatus, clear }
})
