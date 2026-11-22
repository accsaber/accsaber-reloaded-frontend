import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { drawGlow } from '@/utils/cosmetics/sceneLayer'
import { clamp01 } from '@/utils/math'

export interface FlameInk {
  deep: string
  core: string
  blend: GlobalCompositeOperation
}

export function glowDot(ctx: Ctx, x: number, y: number, r: number, color: string, alpha: number): void {
  ctx.globalAlpha = clamp01(alpha)
  drawGlow(ctx, x, y, Math.max(2, r), color, 'rgba(0,0,0,0)')
  ctx.globalAlpha = 1
}

function tongue(ctx: Ctx, x: number, y: number, half: number, tipX: number, tip: number, belly: number, waist: number): void {
  ctx.beginPath()
  ctx.moveTo(x - half, y)
  ctx.quadraticCurveTo(x - half * belly, y - tip * waist, tipX, y - tip)
  ctx.quadraticCurveTo(x + half * belly, y - tip * waist, x + half, y)
  ctx.quadraticCurveTo(x, y + half * 0.55, x - half, y)
  ctx.fill()
}

export function drawFlame(
  ctx: Ctx,
  ink: FlameInk,
  t: number,
  x: number,
  y: number,
  size: number,
  strength: number,
  seed: number,
  lean = 0,
): void {
  if (strength < 0.04 || size < 1) return
  const tip = size * (1.7 + 0.35 * Math.sin(t * 9 + seed) + 0.15 * Math.sin(t * 23 + seed * 2))
  const sway = size * 0.3 * Math.sin(t * 7 + seed) + lean * tip * 0.45
  const w0 = Math.max(0.8, size * 0.55) * (0.7 + 0.3 * strength)
  ctx.globalCompositeOperation = ink.blend
  glowDot(ctx, x, y - tip * 0.35, size * 2.1, ink.deep, 0.4 * strength)
  ctx.fillStyle = ink.deep
  ctx.globalAlpha = 0.85 * strength
  tongue(ctx, x, y, w0, x + sway, tip, 0.95, 0.45)
  ctx.fillStyle = ink.core
  ctx.globalAlpha = 0.95 * strength
  tongue(ctx, x, y, w0 * 0.5, x + sway * 0.6, tip * 0.55, 0.85, 0.5)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}
