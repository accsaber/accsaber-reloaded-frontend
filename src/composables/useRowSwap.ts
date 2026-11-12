import { onUnmounted, ref, shallowRef, watch } from 'vue'

const MAX_SLIDING_ROWS = 10

interface RowSwapOptions<T> {
  key: (row: T, index: number) => string | number
  restart?: () => boolean
  refreshing?: () => boolean | undefined
  loading?: () => boolean | undefined
  placeholders?: () => number
}

function token(name: string): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name))
}

function swapStep(count: number): number {
  return Math.min(token('--stagger'), token('--stagger-total') / count)
}

export function useRowSwap<T extends object>(source: () => T[], options: RowSwapOptions<T>) {
  const placeholderRows = new WeakSet<object>()

  function placeholders(): T[] {
    return Array.from({ length: options.placeholders?.() ?? 0 }, () => {
      const row = {} as T
      placeholderRows.add(row)
      return row
    })
  }

  function isPlaceholder(row: T): boolean {
    return placeholderRows.has(row)
  }

  function keyOf(row: T, index: number): string | number {
    return isPlaceholder(row) ? `placeholder-${index}` : options.key(row, index)
  }

  const shown = shallowRef(options.loading?.() ? placeholders() : source())
  let placeholdersSince = performance.now()
  const staleFrom = ref<number | null>(null)
  const cascade = ref(true)
  const batches = new WeakMap<T, number>()
  let batch = 0
  let swapTimer: ReturnType<typeof setTimeout> | undefined
  let target: T[] | null = null
  let cursor = 0
  let step = 0

  function stamp(rows: T[]) {
    for (const row of rows) batches.set(row, batch)
  }

  function renderKey(row: T, index: number): string {
    return `${batches.get(row) ?? 0}:${keyOf(row, index)}`
  }

  function advance() {
    if (!target) return
    cursor++
    if (cursor >= target.length) {
      shown.value = target
      staleFrom.value = null
      target = null
      return
    }
    const rows = shown.value.slice()
    rows[cursor - 1] = target[cursor - 1]!
    shown.value = rows
    staleFrom.value = cursor
    swapTimer = setTimeout(advance, step)
  }

  function swapRows(next: T[]) {
    step = swapStep(next.length)
    cursor = 0
    cascade.value = false
    batch++
    stamp(next)
    target = next
    advance()
  }

  function sameRows(a: T[], b: T[]): boolean {
    return a.length === b.length && a.every((row, index) => keyOf(row, index) === keyOf(b[index]!, index))
  }

  function retarget(next: T[]) {
    stamp(next)
    const rows = shown.value.slice()
    for (let index = 0; index < cursor; index++) rows[index] = next[index]!
    shown.value = rows
    target = next
  }

  watch(source, (next) => {
    if (options.loading?.() && !next.length) return
    if (target && sameRows(target, next)) return retarget(next)
    clearTimeout(swapTimer)
    target = null
    const unseen = shown.value.some(isPlaceholder) && performance.now() - placeholdersSince < token('--placeholder-delay')
    const prev = unseen ? [] : shown.value
    const previous = new Map(prev.map((row, index) => [keyOf(row, index), index]))
    const positions = next.map((row, index) => previous.get(keyOf(row, index)))
    const kept = positions.filter((position) => position !== undefined).length
    const moved = positions.filter((position, index) => position !== undefined && position !== index).length
    const replaced = kept * 2 < next.length || moved > MAX_SLIDING_ROWS
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const restart = options.restart?.() ?? false
    if (restart || !replaced || still || !prev.length || !next.length) {
      if (restart) batch++
      stamp(next)
      shown.value = next
      staleFrom.value = null
      cascade.value = restart || !prev.length
    } else {
      swapRows(next)
    }
  })

  watch(() => options.refreshing?.(), (refreshing) => {
    if (target) return
    staleFrom.value = refreshing ? 0 : null
  })

  watch(() => options.loading?.(), (loading) => {
    if (target) return
    if (loading) {
      cascade.value = false
      staleFrom.value = null
      placeholdersSince = performance.now()
      shown.value = placeholders()
    } else if (shown.value.some(isPlaceholder)) {
      shown.value = source()
    }
  })

  onUnmounted(() => clearTimeout(swapTimer))

  function isStale(index: number): boolean {
    const row = shown.value[index]
    return staleFrom.value !== null && index >= staleFrom.value && !!row && !isPlaceholder(row)
  }

  return { shown, cascade, isStale, isPlaceholder, renderKey }
}
