import { onUnmounted, ref, shallowRef, watch } from 'vue'

const MAX_SLIDING_ROWS = 10

interface RowSwapOptions<T> {
  key: (row: T, index: number) => string | number
  restart?: () => boolean
  refreshing?: () => boolean | undefined
}

function swapStep(count: number): number {
  const style = getComputedStyle(document.documentElement)
  const stagger = parseFloat(style.getPropertyValue('--stagger'))
  const total = parseFloat(style.getPropertyValue('--stagger-total'))
  return Math.min(stagger, total / count)
}

export function useRowSwap<T extends object>(source: () => T[], options: RowSwapOptions<T>) {
  const shown = shallowRef(source())
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
    return `${batches.get(row) ?? 0}:${options.key(row, index)}`
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
    return a.length === b.length && a.every((row, index) => options.key(row, index) === options.key(b[index]!, index))
  }

  function retarget(next: T[]) {
    stamp(next)
    const rows = shown.value.slice()
    for (let index = 0; index < cursor; index++) rows[index] = next[index]!
    shown.value = rows
    target = next
  }

  watch(source, (next) => {
    if (target && sameRows(target, next)) return retarget(next)
    clearTimeout(swapTimer)
    target = null
    const prev = shown.value
    const previous = new Map(prev.map((row, index) => [options.key(row, index), index]))
    const positions = next.map((row, index) => previous.get(options.key(row, index)))
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

  onUnmounted(() => clearTimeout(swapTimer))

  function isStale(index: number): boolean {
    return staleFrom.value !== null && index >= staleFrom.value
  }

  return { shown, cascade, isStale, renderKey }
}
