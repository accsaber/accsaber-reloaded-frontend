import { useElementCanvas } from '@/composables/useCanvasScene'
import type { ContentBox, EffectMeasure } from '@/utils/cosmetics/effects'
import { computed, ref } from 'vue'

export interface EffectFrame {
  g: CanvasRenderingContext2D
  w: number
  h: number
  t: number
  reduced: boolean
  box: ContentBox
  pad: number
}

export function useEffectCanvas(
  measure: () => EffectMeasure,
  pad: () => number,
  draw: (frame: EffectFrame) => void,
) {
  const canvasRef = ref<HTMLCanvasElement | null>(null)

  const canvasStyle = computed(() => {
    const p = pad()
    const o = measure().overlayBox
    return {
      left: `${-p}px`,
      top: `${-p}px`,
      width: `${o.w + p * 2}px`,
      height: `${o.h + p * 2}px`,
    }
  })

  useElementCanvas(canvasRef, {
    init: () => {},
    draw: (g, w, h, nowMs, reduced) => {
      g.clearRect(0, 0, w, h)
      const b = measure().box
      if (!b.w || !b.h) return
      const p = pad()
      draw({ g, w, h, t: nowMs / 1000, reduced, box: { x: b.x + p, y: b.y + p, w: b.w, h: b.h }, pad: p })
    },
  })

  return { canvasRef, canvasStyle }
}
