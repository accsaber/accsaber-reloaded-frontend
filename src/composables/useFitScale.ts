import { onMounted, onUnmounted, ref, type Ref } from 'vue'

export function useFitScale(host: Ref<HTMLElement | null>, content: Ref<HTMLElement | null>): Ref<number> {
  const scale = ref(1)
  let observer: ResizeObserver | null = null

  function measure(): void {
    const h = host.value
    const c = content.value
    if (!h || !c) return
    const style = getComputedStyle(h)
    const available = h.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
    const needed = c.offsetWidth
    scale.value = needed > 0 && available > 0 ? Math.min(1, available / needed) : 1
  }

  onMounted(() => {
    if (typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver(measure)
    if (host.value) observer.observe(host.value)
    if (content.value) observer.observe(content.value)
    measure()
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  return scale
}
