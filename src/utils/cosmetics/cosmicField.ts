import { darken, lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { fillCircle, type Ctx } from '@/utils/cosmetics/canvasShapes'
import { drawGlow } from '@/utils/cosmetics/sceneLayer'

export function drawCosmicStar(ctx: Ctx, x: number, y: number, r: number, color: string, twinkle: number, bright: boolean, alpha: number): void {
  if (bright) {
    drawGlow(ctx, x, y, r * 3.5, withAlpha(color, 0.9 * twinkle * alpha), withAlpha(color, 0))
  }
  ctx.globalAlpha = (0.35 + 0.65 * twinkle) * alpha
  ctx.fillStyle = color
  fillCircle(ctx, x, y, Math.max(0.5, r * 0.8))
  ctx.globalAlpha = 1
}

export function drawCosmicNebula(ctx: Ctx, x: number, y: number, radius: number, color: string, breathe: number, alpha: number): void {
  drawGlow(ctx, x, y, radius, withAlpha(color, breathe * alpha), withAlpha(color, 0))
}

export function drawCosmicPlanet(ctx: Ctx, x: number, y: number, radius: number, color: string, ringed: boolean, alpha: number): void {
  ctx.globalAlpha = alpha
  const grad = ctx.createRadialGradient(x - radius * 0.4, y - radius * 0.4, radius * 0.15, x, y, radius)
  grad.addColorStop(0, lighten(color, 0.55))
  grad.addColorStop(0.7, color)
  grad.addColorStop(1, darken(color, 0.55))
  ctx.fillStyle = grad
  fillCircle(ctx, x, y, radius)
  if (ringed) {
    ctx.strokeStyle = withAlpha(lighten(color, 0.35), 0.8 * alpha)
    ctx.lineWidth = Math.max(0.6, radius * 0.22)
    ctx.beginPath()
    ctx.ellipse(x, y, radius * 1.8, radius * 0.55, -0.45, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

export function drawCosmicStreak(ctx: Ctx, x: number, y: number, dx: number, dy: number, len: number, color: string, alpha: number, width: number): void {
  const grad = ctx.createLinearGradient(x, y, x - dx * len, y - dy * len)
  grad.addColorStop(0, withAlpha(color, 0.95 * alpha))
  grad.addColorStop(1, withAlpha(color, 0))
  ctx.strokeStyle = grad
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x - dx * len, y - dy * len)
  ctx.stroke()
  ctx.fillStyle = withAlpha(color, alpha)
  fillCircle(ctx, x, y, width * 0.9)
}
