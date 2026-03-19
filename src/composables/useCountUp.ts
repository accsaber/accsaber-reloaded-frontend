import { isRef, onUnmounted, ref, watch, type Ref } from 'vue'

interface CountUpOptions {
  duration?: number
  decimals?: number
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useCountUp(
  targetValue: Ref<number> | number,
  options: CountUpOptions = {},
) {
  const { duration = 400, decimals = 2 } = options
  const displayValue = ref('')
  let rafId: number | null = null
  let currentValue = 0

  function formatValue(val: number): string {
    return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString()
  }

  function animateTo(target: number) {
    if (rafId !== null) cancelAnimationFrame(rafId)

    if (prefersReducedMotion()) {
      currentValue = target
      displayValue.value = formatValue(target)
      return
    }

    const start = currentValue
    const diff = target - start
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      currentValue = start + diff * easeOut(progress)
      displayValue.value = formatValue(currentValue)

      if (progress < 1) {
        rafId = requestAnimationFrame(tick)
      } else {
        currentValue = target
        displayValue.value = formatValue(target)
        rafId = null
      }
    }

    rafId = requestAnimationFrame(tick)
  }

  if (isRef(targetValue)) {
    watch(
      targetValue,
      (newVal) => animateTo(newVal),
      { immediate: true },
    )
  } else {
    animateTo(targetValue)
  }

  onUnmounted(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
  })

  return { displayValue }
}
