import type { SortDirection, SortState } from '@/types/display'
import { computed, ref, watch, type Ref } from 'vue'

export const DELTA_MODES = ['size', 'up', 'down'] as const

export type DeltaMode = (typeof DELTA_MODES)[number]

export type SortBasis = 'change' | 'now' | 'after'

export const BASIS_TABS: { key: SortBasis; label: string }[] = [
  { key: 'change', label: 'Change' },
  { key: 'now', label: 'Now' },
  { key: 'after', label: 'After' },
]

export type BasisKeys = Record<string, Record<SortBasis, string>>

export function useSortBasis(
  metrics: () => BasisKeys,
  sort: { sortKey: Ref<string>; deltaMode: Ref<DeltaMode>; setKey: (key: string) => void },
  initial: SortBasis = 'change',
) {
  const basis = ref<SortBasis>(initial)

  function keyOf(metric: string): string {
    return metrics()[metric][basis.value]
  }

  function setBasis(next: string) {
    const held = Object.values(metrics()).find((keys) => Object.values(keys).includes(sort.sortKey.value))
    basis.value = next as SortBasis
    if (held) sort.setKey(held[basis.value])
  }

  function label(metric: string, text: string): string {
    return basis.value === 'change' && sort.sortKey.value === keyOf(metric) ? `${text} (${sort.deltaMode.value})` : text
  }

  return { basis, keyOf, setBasis, label }
}

export type SortAccessor<T> = (row: T) => number | string | null

interface SortStateOptions {
  deltaKeys: readonly string[]
  defaultKey: string
  ascendingKeys?: readonly string[]
}

interface ScenarioSortOptions<T> extends SortStateOptions {
  rows: Ref<T[]>
  accessors: Record<string, SortAccessor<T>>
  pageSize?: number
  revision?: () => unknown
}

export function useSortState(options: SortStateOptions) {
  const sortKey = ref(options.defaultKey)
  const sortDirection = ref<SortDirection>(
    options.ascendingKeys?.includes(options.defaultKey) ? 'asc' : 'desc',
  )
  const deltaMode = ref<DeltaMode>('size')

  const sortState = computed<SortState>(() => ({
    key: sortKey.value,
    direction: sortDirection.value,
  }))

  const absolute = computed(
    () => options.deltaKeys.includes(sortKey.value) && deltaMode.value === 'size',
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

  function setKey(key: string) {
    sortKey.value = key
    deltaMode.value = 'size'
    sortDirection.value = options.ascendingKeys?.includes(key) ? 'asc' : 'desc'
  }

  return { sortKey, sortDirection, deltaMode, sortState, absolute, onSort, setKey }
}

export function useScenarioSort<T>(options: ScenarioSortOptions<T>) {
  const pageSize = options.pageSize ?? 50
  const { sortKey, sortDirection, deltaMode, sortState, onSort, setKey } = useSortState(options)
  const page = ref(1)

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
    setKey,
    setPage,
  }
}
