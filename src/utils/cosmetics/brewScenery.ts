import type { BrewIngredientKind } from '@/types/api/items'
import { lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

export const BREW_INGREDIENT_KINDS: BrewIngredientKind[] = ['eye', 'mushroom', 'newt', 'spider']

export function boneShape(ctx: Ctx, size: number): void {
  ctx.beginPath()
  ctx.roundRect(-size, -size * 0.18, size * 2, size * 0.36, size * 0.18)
  ctx.fill()
  for (const ex of [-1, 1]) {
    for (const ey of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(ex * size, ey * size * 0.22, size * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function skullShape(ctx: Ctx, size: number, color: string): void {
  ctx.beginPath()
  ctx.arc(0, -size * 0.2, size * 0.85, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(-size * 0.5, size * 0.3, size, size * 0.55)
  ctx.fillStyle = color
  for (const ex of [-0.33, 0.33]) {
    ctx.beginPath()
    ctx.arc(ex * size, -size * 0.25, size * 0.24, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.moveTo(0, size * 0.05)
  ctx.lineTo(size * 0.12, size * 0.3)
  ctx.lineTo(-size * 0.12, size * 0.3)
  ctx.closePath()
  ctx.fill()
  for (let i = -1; i <= 1; i++) ctx.fillRect(i * size * 0.26 - size * 0.05, size * 0.45, size * 0.1, size * 0.3)
}

export function drawBubble(ctx: Ctx, x: number, y: number, r: number, pop: number, stroke: number, color: string): void {
  if (pop > 0) {
    ctx.strokeStyle = withAlpha(lighten(color, 0.5), 0.6 * (1 - pop / 0.3))
    ctx.lineWidth = Math.max(0.6, stroke)
    ctx.beginPath()
    ctx.arc(x, y, r * (1 + pop * 6), 0, Math.PI * 2)
    ctx.stroke()
    return
  }
  ctx.fillStyle = withAlpha(lighten(color, 0.45), 0.35)
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = withAlpha('#ffffff', 0.4)
  ctx.beginPath()
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.25, 0, Math.PI * 2)
  ctx.fill()
}

function drawEye(ctx: Ctx, s: number): void {
  ctx.fillStyle = '#e9e3d0'
  ctx.beginPath()
  ctx.arc(0, 0, s, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#7cb342'
  ctx.beginPath()
  ctx.arc(s * 0.15, 0, s * 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0a0a0e'
  ctx.beginPath()
  ctx.arc(s * 0.2, 0, s * 0.22, 0, Math.PI * 2)
  ctx.fill()
}

function drawMushroom(ctx: Ctx, s: number): void {
  ctx.fillStyle = '#e9e3d0'
  ctx.fillRect(-s * 0.25, 0, s * 0.5, s)
  ctx.fillStyle = '#b91c1c'
  ctx.beginPath()
  ctx.arc(0, 0, s, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = '#e9e3d0'
  for (const [dx, dy] of [[-0.4, -0.4], [0.35, -0.5], [0, -0.15]]) {
    ctx.beginPath()
    ctx.arc(dx * s, dy * s, s * 0.14, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawNewt(ctx: Ctx, s: number): void {
  ctx.fillStyle = '#e8781e'
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 1.1, s * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(s * 1, 0)
  ctx.quadraticCurveTo(s * 1.8, s * 0.1, s * 2.2, -s * 0.5)
  ctx.lineWidth = s * 0.22
  ctx.strokeStyle = '#e8781e'
  ctx.stroke()
  ctx.fillStyle = '#0a0a0e'
  ctx.beginPath()
  ctx.arc(-s * 0.6, -s * 0.15, s * 0.1, 0, Math.PI * 2)
  ctx.fill()
}

function drawSpider(ctx: Ctx, s: number): void {
  ctx.fillStyle = '#0a0a0e'
  ctx.beginPath()
  ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#0a0a0e'
  ctx.lineWidth = s * 0.14
  for (let i = 0; i < 4; i++) {
    for (const sd of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(sd * s * 0.4, -s * 0.3 + i * s * 0.22)
      ctx.lineTo(sd * s * 1.2, -s * 0.7 + i * s * 0.35)
      ctx.lineTo(sd * s * 1.5, s * 0.1 + i * s * 0.3)
      ctx.stroke()
    }
  }
}

export function drawIngredient(ctx: Ctx, kind: BrewIngredientKind, s: number): void {
  if (kind === 'eye') drawEye(ctx, s)
  else if (kind === 'mushroom') drawMushroom(ctx, s)
  else if (kind === 'newt') drawNewt(ctx, s)
  else drawSpider(ctx, s)
}
