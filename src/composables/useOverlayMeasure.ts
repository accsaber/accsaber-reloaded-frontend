import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import type { ContentBox, OverlayBox } from '@/utils/cosmetics/effects'

export function useOverlayMeasure(
  overlayEl: Ref<HTMLElement | null>,
  measureSelector: () => string | undefined,
) {
  const overlayBox = ref<OverlayBox>({ w: 0, h: 0 })
  const contentBox = ref<ContentBox | null>(null)
  let ro: ResizeObserver | null = null
  let observedTarget: Element | null = null
  let layoutSize: { w: number; h: number } | null = null

  function measure() {
    const el = overlayEl.value
    if (!el) return
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) return
    const kx = layoutSize?.w ? layoutSize.w / r.width : 1
    const ky = layoutSize?.h ? layoutSize.h / r.height : 1
    overlayBox.value = { w: r.width * kx, h: r.height * ky }
    let target: Element | null = null
    const selector = measureSelector()
    if (selector && el.parentElement) {
      for (const part of selector.split(',')) {
        target = el.parentElement.querySelector(part.trim())
        if (target) break
      }
    }
    if (target && target !== observedTarget && ro) {
      if (observedTarget) ro.unobserve(observedTarget)
      ro.observe(target)
      observedTarget = target
    }
    const tr = target?.getBoundingClientRect()
    contentBox.value = tr && tr.width && tr.height
      ? {
          x: (tr.left - r.left) * kx,
          y: (tr.top - r.top) * ky,
          w: tr.width * kx,
          h: tr.height * ky,
        }
      : null
  }

  onMounted(() => {
    ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== overlayEl.value) continue
        const size = entry.borderBoxSize[0]
        if (size) layoutSize = { w: size.inlineSize, h: size.blockSize }
      }
      measure()
    })
    if (overlayEl.value) ro.observe(overlayEl.value)
    measure()
  })
  onUnmounted(() => ro?.disconnect())

  const box = computed<ContentBox>(() => contentBox.value ?? { x: 0, y: 0, ...overlayBox.value })

  return { overlayBox, box }
}
