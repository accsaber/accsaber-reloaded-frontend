import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'

export interface AuroraBand {
  left: number
  span: number
  base: number
  reach: number
  sway: number
  step: number
  edge?: number
}

export function drawAuroraCurtain(ctx: Ctx, band: AuroraBand, t: number, k: number, color: string): void {
  const { left, span, base, reach, sway, step, edge = 0.6 } = band
  const grad = ctx.createLinearGradient(0, 0, 0, -reach)
  grad.addColorStop(0, withAlpha(color, 0))
  grad.addColorStop(0.16, withAlpha(color, 0.6))
  grad.addColorStop(0.6, withAlpha(color, 0.3))
  grad.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = grad
  for (let x = 0; x < span; x += step) {
    const u = x / span
    const drift = Math.sin(u * 5 + t * 0.5 + k * 2.1) * sway * 0.16 + Math.sin(u * 11 - t * 0.35 + k) * sway * 0.06
    const ray = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(u * 19 + t * 0.9 + k * 4.7)) * (0.5 + 0.5 * Math.sin(u * 6 - t * 0.5))
    const height = reach * (0.6 + 0.4 * Math.sin(u * 3.4 + t * 0.3 + k * 1.3) ** 2)
    const x0 = Math.round(left + x)
    ctx.globalAlpha = ray * Math.sin(Math.PI * u) ** edge
    ctx.save()
    ctx.translate(0, base + drift)
    ctx.scale(1, height / reach)
    ctx.fillRect(x0, -reach, Math.round(left + x + step) - x0, reach)
    ctx.restore()
  }
  ctx.globalAlpha = 1
}

const HUE_DRIFT = 0.05
const HUE_CYCLE = 1.6
export const AURORA_UNTINTED = '#ffffff'

export function tintAurora(ctx: Ctx, w: number, h: number, t: number, hues: string[]): void {
  const cycle = Math.min(w, h * HUE_CYCLE)
  const repeats = Math.ceil(w / cycle) + 1
  const shift = ((t * HUE_DRIFT) % 1) * cycle
  const sweep = ctx.createLinearGradient(-shift, 0, cycle * repeats - shift, 0)
  const stops = hues.length * repeats
  for (let i = 0; i <= stops; i++) sweep.addColorStop(i / stops, hues[i % hues.length])
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = 1
  ctx.fillStyle = sweep
  ctx.fillRect(0, 0, w, h)
}

export function drawAuroraLayer(ctx: Ctx, layer: HTMLCanvasElement, w: number, h: number, t: number, colors: string[], band: (k: number) => AuroraBand, hues?: string[]): void {
  const lctx = layer.getContext('2d')
  if (!lctx) return
  lctx.clearRect(0, 0, w, h)
  lctx.globalCompositeOperation = 'lighter'
  colors.forEach((color, k) => drawAuroraCurtain(lctx, band(k), t, k, hues?.length ? AURORA_UNTINTED : color))
  if (hues?.length) tintAurora(lctx, w, h, t, hues)
  lctx.globalCompositeOperation = 'source-over'
  ctx.globalCompositeOperation = 'lighter'
  ctx.drawImage(layer, 0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'
}
