import { onMounted, ref, watch, type Ref } from 'vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { useRenderLoop } from '@/composables/useRenderLoop'
import { observeVisible } from '@/utils/observe'

const MAX_GAP_MS = 100

interface UseTimelineOptions {
  active: () => boolean
  el?: Readonly<Ref<Element | null>>
}

export function useTimeline(options: UseTimelineOptions): { tMs: Ref<number> } {
  const tMs = ref(0)
  const reduced = useReducedMotion()
  const visible = ref(true)
  let last = 0

  const running = () => visible.value && !reduced.value && options.active()

  const loop = useRenderLoop((now) => {
    if (last) tMs.value += Math.min(now - last, MAX_GAP_MS)
    last = now
  }, running)

  function start() {
    last = 0
    loop.start()
  }

  watch(running, start)
  onMounted(start)

  watch(
    () => options.el?.value,
    (el, _old, onCleanup) => {
      if (el) onCleanup(observeVisible(el, (v) => { visible.value = v }))
    },
    { immediate: true, flush: 'post' },
  )

  return { tMs }
}
