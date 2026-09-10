import type { SortDirection, SortState } from '@/types/display'
import { computed, ref, watch, type Ref } from 'vue'

export const DELTA_MODES = ['size', 'up', 'down'] as const

export type DeltaMode = (typeof DELTA_MODES)[number]

export type SortAccessor<T> = (row: T) => number | string | null

interface ScenarioSortOptions<T> {
  rows: Ref<T[]>
  accessors: Record<string, SortAccessor<T>>
  deltaKeys: readonly string[]
  defaultKey: string
  ascendingKeys?: readonly string[]
  pageSize?: number
  revision?: () => unknown
}

export function useScenarioSort<T>(options: ScenarioSortOptions<T>) {
  const pageSize = options.pageSize ?? 50
  const sortKey = ref(options.defaultKey)
  const sortDirection = ref<SortDirection>(
    options.ascendingKeys?.includes(options.defaultKey) ? 'asc' : 'desc',
  )
  const deltaMode = ref<DeltaMode>('size')
  const page = ref(1)

  const sortState = computed<SortState>(() => ({
    key: sortKey.value,
    direction: sortDirection.value,
  }))

  function readSortValue(row: T): number | string | null {
    const read = options.accessors[sortKey.value]
    if (!read) return null
    const raw = read(row)
    const bySize = options.deltaKeys.includes(sortKey.value) && deltaMode.value === 'size'
    return bySize && typeof raw === 'number' ? Math.abs(raw) : raw
  }

  function compare(a: T, b: T): number {
    const left = readSortValue(a)
    const right = readSortValue(b)
    if (left == null && right == null) return 0
    if (left == null) return 1
    if (right == null) return -1
    const order = typeof left === 'string'
      ? left.localeCompare(String(right))
      : (left as number) - (right as number)
    return sortDirection.value === 'asc' ? order : -order
  }

  const sorted = computed(() => {
    options.revision?.()
    return [...options.rows.value].sort(compare)
  })

  const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / pageSize)))

  const visible = computed(() =>
    sorted.value.slice((page.value - 1) * pageSize, page.value * pageSize),
  )

  function onSort(key: string) {
    if (options.deltaKeys.includes(key)) {
      if (sortKey.value === key) {
        deltaMode.value = DELTA_MODES[(DELTA_MODES.indexOf(deltaMode.value) + 1) % DELTA_MODES.length]
      } else {
        sortKey.value = key
        deltaMode.value = 'size'
      }
      sortDirection.value = deltaMode.value === 'down' ? 'asc' : 'desc'
      return
    }
    if (sortKey.value === key) {
      sortDirection.value = sortDirection.value === 'desc' ? 'asc' : 'desc'
      return
    }
    sortKey.value = key
    sortDirection.value = options.ascendingKeys?.includes(key) ? 'asc' : 'desc'
  }

  function setPage(value: number) {
    page.value = value
  }

  watch([options.rows, sortKey, sortDirection, deltaMode], () => {
    page.value = 1
  })

  return {
    sortKey,
    sortDirection,
    deltaMode,
    sortState,
    page,
    totalPages,
    visible,
    onSort,
    setPage,
  }
}
