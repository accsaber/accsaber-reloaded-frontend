import { useElementCanvas } from '@/composables/useCanvasScene'
import { titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { useTemplateRef, type ShallowRef } from 'vue'

export interface TitleAuraFrame {
  rect: TitleAuraRect
  t: number
  now: number
  reduced: boolean
  w: number
  h: number
}

export interface TitleAuraScene {
  staticT?: number
  additive?: () => boolean
  keep?: boolean
  init?: (rect: TitleAuraRect, now: number, scale: number) => void
  layout?: (rect: TitleAuraRect, now: number, scale: number) => void
  draw: (ctx: CanvasRenderingContext2D, frame: TitleAuraFrame) => void
}

export function useTitleAura(scene: TitleAuraScene): Readonly<ShallowRef<HTMLCanvasElement | null>> {
  const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
  let rect: TitleAuraRect | null = null

  function measure(first: boolean, now: number, scale: number) {
    rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
    if (!rect) return
    if (first) scene.init?.(rect, now, scale)
    scene.layout?.(rect, now, scale)
  }

  useElementCanvas(canvasRef, {
    init: (_w, _h, now, scale) => measure(true, now, scale),
    resize: (_w, _h, now, scale) => measure(false, now, scale),
    draw(ctx, w, h, now, reduced) {
      if (!scene.keep) ctx.clearRect(0, 0, w, h)
      if (!rect) return
      const additive = scene.additive?.() ?? false
      if (additive) ctx.globalCompositeOperation = 'lighter'
      scene.draw(ctx, { rect, t: reduced ? (scene.staticT ?? 3) : now / 1000, now, reduced, w, h })
      if (additive) ctx.globalCompositeOperation = 'source-over'
    },
  })

  return canvasRef
}

export function pigments<K extends string>(
  spec: object,
  light: boolean,
  defaults: Record<K, string>,
): Record<K, string> {
  const source = spec as Record<string, unknown>
  const out = {} as Record<K, string>
  for (const key in defaults) {
    const lit = light ? source[`light${key[0].toUpperCase()}${key.slice(1)}`] : undefined
    const base = source[key]
    out[key] = typeof lit === 'string' ? lit : typeof base === 'string' ? base : defaults[key]
  }
  return out
}
