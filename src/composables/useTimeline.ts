import { onUnmounted, ref, watchEffect, type Ref } from 'vue'

export interface UseTimelineOptions {
  active: () => boolean
  reducedMotion?: boolean
}

export function useTimeline(options: UseTimelineOptions): { tMs: Ref<number> } {
  const tMs = ref(0)

  const reducedMotion =
    options.reducedMotion
    ?? (typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  let rafId: number | null = null
  let baseTime = 0

  function tick(now: number) {
    tMs.value = now - baseTime
    rafId = requestAnimationFrame(tick)
  }

  function start() {
    if (rafId !== null) return
    baseTime = performance.now() - tMs.value
    rafId = requestAnimationFrame(tick)
  }

  function stop() {
    if (rafId === null) return
    cancelAnimationFrame(rafId)
    rafId = null
  }

  watchEffect(() => {
    if (reducedMotion) {
      stop()
      return
    }
    if (options.active()) start()
    else stop()
  })

  onUnmounted(stop)

  return { tMs }
}
