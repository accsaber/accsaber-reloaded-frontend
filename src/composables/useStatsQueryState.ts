import { storeCountry } from '@/utils/statsCountry'
import type { LocationQueryValue } from 'vue-router'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export type StatsQueryValue = string | string[] | undefined

function readSingle(raw: LocationQueryValue | LocationQueryValue[]): string {
  if (Array.isArray(raw)) return raw[0] ?? ''
  return raw ?? ''
}

function readMulti(raw: LocationQueryValue | LocationQueryValue[]): string[] {
  if (Array.isArray(raw)) return raw.filter((v): v is string => !!v)
  return raw ? [raw] : []
}

/**
 * URL-backed filter and page state for the stats boards. The statistics
 * endpoints order their own rows, so there is no sort key to carry - only page
 * and filters, with multi-selects serialised as repeated query keys.
 */
export function useStatsQueryState() {
  const route = useRoute()
  const router = useRouter()

  const currentPage = computed<number>(() => {
    const page = Number(readSingle(route.query.page))
    return page > 0 ? page : 1
  })

  function param(key: string): string {
    return readSingle(route.query[key])
  }

  function multiParam(key: string): string[] {
    return readMulti(route.query[key])
  }

  function numberParam(key: string): number | undefined {
    const raw = readSingle(route.query[key])
    if (!raw) return undefined
    const value = Number(raw)
    return Number.isFinite(value) ? value : undefined
  }

  function patch(changes: Record<string, StatsQueryValue>, keepPage = false) {
    const query: Record<string, StatsQueryValue> = { ...route.query } as Record<string, StatsQueryValue>
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        delete query[key]
      } else {
        query[key] = value
      }
    }
    if (!keepPage) delete query.page
    router.replace({ query })
  }

  function setParam(key: string, value: string) {
    if (key === 'country') storeCountry(value)
    patch({ [key]: value })
  }

  function toggleMulti(key: string, value: string) {
    const active = multiParam(key)
    patch({ [key]: active.includes(value) ? active.filter((v) => v !== value) : [...active, value] })
  }

  function setPage(page: number) {
    const query = { ...route.query }
    if (page <= 1) {
      delete query.page
    } else {
      query.page = String(page)
    }
    router.push({ query })
  }

  return { currentPage, param, multiParam, numberParam, patch, setParam, toggleMulti, setPage }
}
