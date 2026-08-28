import { darken, lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

export function drawCosmicStar(ctx: Ctx, x: number, y: number, r: number, color: string, twinkle: number, bright: boolean, alpha: number): void {
  if (bright) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5)
    grad.addColorStop(0, withAlpha(color, 0.9 * twinkle * alpha))
    grad.addColorStop(1, withAlpha(color, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, r * 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = (0.35 + 0.65 * twinkle) * alpha
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0.5, r * 0.8), 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

export function drawCosmicNebula(ctx: Ctx, x: number, y: number, radius: number, color: string, breathe: number, alpha: number): void {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius)
  grad.addColorStop(0, withAlpha(color, breathe * alpha))
  grad.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

export function drawCosmicPlanet(ctx: Ctx, x: number, y: number, radius: number, color: string, ringed: boolean, alpha: number): void {
  ctx.globalAlpha = alpha
  const grad = ctx.createRadialGradient(x - radius * 0.4, y - radius * 0.4, radius * 0.15, x, y, radius)
  grad.addColorStop(0, lighten(color, 0.55))
  grad.addColorStop(0.7, color)
  grad.addColorStop(1, darken(color, 0.55))
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
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
  ctx.beginPath()
  ctx.arc(x, y, width * 0.9, 0, Math.PI * 2)
  ctx.fill()
}
