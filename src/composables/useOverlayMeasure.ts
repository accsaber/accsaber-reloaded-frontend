import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import type { ContentBox, OverlayBox, TextInk } from '@/utils/cosmetics/effects'

let ruler: CanvasRenderingContext2D | null = null

function textInk(target: Element, height: number): TextInk | null {
  const text = target.textContent?.trim()
  if (!text) return null
  ruler ??= document.createElement('canvas').getContext('2d')
  if (!ruler) return null
  const style = getComputedStyle(target)
  ruler.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const m = ruler.measureText(style.textTransform === 'uppercase' ? text.toUpperCase() : text)
  const baseline = (height - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2 + m.fontBoundingBoxAscent
  return { top: baseline - m.actualBoundingBoxAscent, bottom: baseline + m.actualBoundingBoxDescent }
}

export function useOverlayMeasure(
  overlayEl: Ref<HTMLElement | null>,
  measureSelector: () => string | undefined,
) {
  const overlayBox = ref<OverlayBox>({ w: 0, h: 0 })
  const contentBox = ref<ContentBox | null>(null)
  const ink = ref<TextInk | null>(null)
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
    const raw = target && tr?.height ? textInk(target, tr.height) : null
    ink.value = raw ? { top: raw.top * ky, bottom: raw.bottom * ky } : null
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

  return { overlayBox, box, ink }
}
