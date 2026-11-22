import { observeSize } from '@/utils/observe'
import { ref, watch, type Ref } from 'vue'

export function useFitScale(host: Ref<HTMLElement | null>, content: Ref<HTMLElement | null>): Ref<number> {
  const scale = ref(1)

  function measure(): void {
    const h = host.value
    const c = content.value
    if (!h || !c) return
    const style = getComputedStyle(h)
    const available = h.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    const needed = c.offsetWidth
    scale.value = needed > 0 && available > 0 ? Math.min(1, available / needed) : 1
  }

  watch(
    [host, content],
    ([h, c], _old, onCleanup) => {
      if (!h || !c) return
      const stops = [observeSize(h, measure), observeSize(c, measure)]
      onCleanup(() => stops.forEach((stop) => stop()))
      measure()
    },
    { flush: 'post' },
  )

  return scale
}
