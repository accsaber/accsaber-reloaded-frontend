import { darken, lerpHex, lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

type Seed = (n: number) => number

export interface GraveColors {
  stone: string
  ground: string
  moon: string
  sky: string
}

export interface Stone {
  x: number
  y: number
  s: number
  kind: number
  lean: number
}

function stonePath(ctx: Ctx, st: Stone): void {
  const s = st.s
  ctx.beginPath()
  if (st.kind === 0) {
    ctx.moveTo(-s * 4, 0)
    ctx.lineTo(-s * 4, -s * 7)
    ctx.arc(0, -s * 7, s * 4, Math.PI, 0)
    ctx.lineTo(s * 4, 0)
  } else if (st.kind === 1) {
    ctx.rect(-s * 1.2, -s * 12, s * 2.4, s * 12)
    ctx.rect(-s * 4, -s * 9, s * 8, s * 2.2)
  } else if (st.kind === 2) {
    ctx.moveTo(-s * 2.5, 0)
    ctx.lineTo(-s * 1.4, -s * 13)
    ctx.lineTo(0, -s * 15.5)
    ctx.lineTo(s * 1.4, -s * 13)
    ctx.lineTo(s * 2.5, 0)
  } else {
    ctx.moveTo(-s * 4, 0)
    ctx.lineTo(-s * 4, -s * 6)
    ctx.lineTo(-s * 1.5, -s * 9)
    ctx.lineTo(s * 1, -s * 5.5)
    ctx.lineTo(s * 4, -s * 7)
    ctx.lineTo(s * 4, 0)
  }
  ctx.closePath()
}

export function stoneTop(st: Stone): number {
  return st.s * (st.kind === 2 ? 15.5 : st.kind === 1 ? 12 : st.kind === 0 ? 11 : 9)
}

export function drawHeadstone(ctx: Ctx, st: Stone, c: GraveColors, moonX: number): void {
  ctx.save()
  ctx.translate(st.x, st.y)
  ctx.fillStyle = withAlpha('#000000', 0.4)
  ctx.beginPath()
  ctx.ellipse(0, st.s * 0.4, st.s * 5, st.s * 1, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.rotate(st.lean)
  ctx.fillStyle = c.stone
  stonePath(ctx, st)
  ctx.fill()
  ctx.save()
  stonePath(ctx, st)
  ctx.clip()
  const side = moonX > st.x ? 1 : -1
  const g = ctx.createLinearGradient(-st.s * 4 * side, 0, st.s * 4 * side, 0)
  g.addColorStop(0, withAlpha('#000000', 0.35))
  g.addColorStop(1, withAlpha(c.moon, 0.14))
  ctx.fillStyle = g
  ctx.fillRect(-st.s * 5, -st.s * 16, st.s * 10, st.s * 17)
  ctx.strokeStyle = withAlpha('#000000', 0.45)
  ctx.lineWidth = Math.max(0.5, st.s * 0.3)
  if (st.kind === 0 || st.kind === 3) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(-st.s * 2.4, -st.s * (6 - i * 1.4))
      ctx.lineTo(st.s * (2.4 - i * 0.8), -st.s * (6 - i * 1.4))
      ctx.stroke()
    }
  }
  ctx.restore()
  ctx.strokeStyle = c.ground
  ctx.lineWidth = Math.max(0.5, st.s * 0.35)
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo(i * st.s * 1.6, st.s * 0.3)
    ctx.lineTo(i * st.s * 1.6 + (i % 2 ? st.s : -st.s * 0.6), -st.s * 1.6)
    ctx.stroke()
  }
  ctx.restore()
}

export function drawCrypt(ctx: Ctx, x: number, y: number, s: number, c: GraveColors): void {
  const body = lerpHex(c.stone, c.sky, 0.35)
  const dark = darken(body, 0.45)
  const light = lighten(body, 0.15)
  ctx.fillStyle = darken(body, 0.2)
  ctx.fillRect(x - s * 17, y - s * 1.2, s * 34, s * 1.4)
  ctx.fillRect(x - s * 15.5, y - s * 2.4, s * 31, s * 1.4)
  ctx.fillStyle = body
  ctx.fillRect(x - s * 14, y - s * 18, s * 28, s * 16)
  ctx.strokeStyle = withAlpha('#000000', 0.28)
  ctx.lineWidth = Math.max(0.5, s * 0.25)
  for (let row = 0; row < 5; row++) {
    const yy = y - s * 18 + s * 3.2 * (row + 1)
    ctx.beginPath()
    ctx.moveTo(x - s * 14, yy)
    ctx.lineTo(x + s * 14, yy)
    ctx.stroke()
    for (let col = 0; col < 4; col++) {
      const xx = x - s * 14 + s * 7 * col + (row % 2 ? s * 3.5 : 0)
      ctx.beginPath()
      ctx.moveTo(xx, yy - s * 3.2)
      ctx.lineTo(xx, yy)
      ctx.stroke()
    }
  }
  ctx.fillStyle = light
  ctx.beginPath()
  ctx.moveTo(x - s * 16.5, y - s * 18)
  ctx.lineTo(x, y - s * 25.5)
  ctx.lineTo(x + s * 16.5, y - s * 18)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = withAlpha('#000000', 0.35)
  ctx.beginPath()
  ctx.moveTo(x, y - s * 25.5)
  ctx.lineTo(x + s * 16.5, y - s * 18)
  ctx.lineTo(x, y - s * 18)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = darken(body, 0.15)
  ctx.fillRect(x - s * 16.5, y - s * 18.6, s * 33, s * 1.2)
  for (const cx of [-11, 11]) {
    ctx.fillStyle = light
    ctx.fillRect(x + cx * s - s * 1.4, y - s * 17, s * 2.8, s * 15)
    ctx.fillRect(x + cx * s - s * 2, y - s * 17.6, s * 4, s * 1.2)
    ctx.fillRect(x + cx * s - s * 2, y - s * 3.2, s * 4, s * 1.2)
  }
  ctx.fillStyle = dark
  ctx.fillRect(x - s * 4.2, y - s * 13, s * 8.4, s * 11)
  ctx.beginPath()
  ctx.arc(x, y - s * 13, s * 4.2, Math.PI, 0)
  ctx.fill()
  ctx.strokeStyle = withAlpha(lighten(body, 0.3), 0.55)
  ctx.lineWidth = Math.max(0.5, s * 0.35)
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath()
    ctx.moveTo(x + i * s * 1.1, y - s * (13 + Math.sqrt(Math.max(0, 17.6 - (i * 1.1) ** 2))))
    ctx.lineTo(x + i * s * 1.1, y - s * 2)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(x - s * 4.2, y - s * 8)
  ctx.lineTo(x + s * 4.2, y - s * 8)
  ctx.stroke()
  ctx.fillStyle = dark
  ctx.beginPath()
  ctx.arc(x, y - s * 21, s * 1.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = withAlpha(lighten(body, 0.3), 0.5)
  ctx.beginPath()
  ctx.moveTo(x - s * 1.6, y - s * 21)
  ctx.lineTo(x + s * 1.6, y - s * 21)
  ctx.moveTo(x, y - s * 22.6)
  ctx.lineTo(x, y - s * 19.4)
  ctx.stroke()
  ctx.fillStyle = withAlpha('#000000', 0.3)
  ctx.fillRect(x - s * 3, y - s * 15.6, s * 6, s * 1.6)
  ctx.fillStyle = light
  ctx.fillRect(x - s * 1, y - s * 30, s * 2, s * 5)
  ctx.fillRect(x - s * 2.6, y - s * 28.6, s * 5.2, s * 1.2)
  ctx.strokeStyle = withAlpha('#000000', 0.45)
  ctx.lineWidth = Math.max(0.5, s * 0.22)
  ctx.beginPath()
  ctx.moveTo(x + s * 7, y - s * 17)
  ctx.lineTo(x + s * 6.2, y - s * 13.5)
  ctx.lineTo(x + s * 7.4, y - s * 10.5)
  ctx.stroke()
}

function branch(ctx: Ctx, x: number, y: number, ang: number, len: number, wdt: number, depth: number, k: number, seed: Seed): void {
  const ex = x + Math.cos(ang) * len
  const ey = y + Math.sin(ang) * len
  ctx.lineWidth = Math.max(0.6, wdt)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + Math.cos(ang + 0.35) * len * 0.5, y + Math.sin(ang + 0.35) * len * 0.5, ex, ey)
  ctx.stroke()
  if (depth === 0) return
  for (let i = 0; i < 2 + (seed(k * 17) < 0.4 ? 1 : 0); i++) {
    branch(ctx, ex, ey, ang + (seed(k * 19 + i * 7) - 0.5) * 1.6, len * (0.55 + seed(k * 23 + i) * 0.25), wdt * 0.6, depth - 1, k * 31 + i + 1, seed)
  }
}

export function drawDeadTree(ctx: Ctx, x: number, y: number, s: number, color: string, seed: Seed, k = 1): void {
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineWidth = s * 3
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + s * 2, y - s * 14, x - s * 3, y - s * 28)
  ctx.stroke()
  branch(ctx, x - s * 3, y - s * 28, -Math.PI / 2 + 0.3, s * 16, s * 2, 4, k, seed)
  branch(ctx, x + s * 0.5, y - s * 16, -0.3, s * 12, s * 1.4, 3, k * 77, seed)
}

export function drawIronFence(ctx: Ctx, x0: number, x1: number, y: number, s: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x0, y - s * 6, x1 - x0, s * 0.6)
  ctx.fillRect(x0, y - s * 2, x1 - x0, s * 0.6)
  for (let x = x0 + s * 1.5; x < x1; x += s * 3.2) {
    ctx.fillRect(x - s * 0.25, y - s * 8.5, s * 0.5, s * 9)
    ctx.beginPath()
    ctx.moveTo(x - s * 0.9, y - s * 8.5)
    ctx.lineTo(x, y - s * 10.5)
    ctx.lineTo(x + s * 0.9, y - s * 8.5)
    ctx.closePath()
    ctx.fill()
  }
}

export function drawRaven(ctx: Ctx, x: number, y: number, s: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(x, y - s * 1.6, s * 2.2, s * 1.3, -0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + s * 1.8, y - s * 3, s * 0.9, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x + s * 2.6, y - s * 3)
  ctx.lineTo(x + s * 3.8, y - s * 2.7)
  ctx.lineTo(x + s * 2.6, y - s * 2.5)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x - s * 2, y - s * 1.8)
  ctx.lineTo(x - s * 4.2, y - s * 1.2)
  ctx.lineTo(x - s * 2.2, y - s * 1)
  ctx.closePath()
  ctx.fill()
}

export function drawBat(ctx: Ctx, x: number, y: number, s: number, f: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x - s * 1.6, y - s * (0.8 + f), x - s * 3, y - s * f * 1.4)
  ctx.quadraticCurveTo(x - s * 1.8, y + s * 0.4, x, y + s * 0.6)
  ctx.quadraticCurveTo(x + s * 1.8, y + s * 0.4, x + s * 3, y - s * f * 1.4)
  ctx.quadraticCurveTo(x + s * 1.6, y - s * (0.8 + f), x, y)
  ctx.fill()
}

export function drawWisp(ctx: Ctx, at: (lag: number) => [number, number], s: number, color: string): void {
  const [x, y] = at(0)
  const glow = ctx.createRadialGradient(x, y, 0, x, y, s * 10)
  glow.addColorStop(0, withAlpha(color, 0.35))
  glow.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = glow
  ctx.fillRect(x - s * 10, y - s * 10, s * 20, s * 20)
  for (let i = 1; i <= 5; i++) {
    const [tx, ty] = at(i * 0.12)
    ctx.fillStyle = withAlpha(color, 0.5 - i * 0.09)
    ctx.beginPath()
    ctx.arc(tx, ty, s * (1.6 - i * 0.25), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = withAlpha(lighten(color, 0.5), 0.9)
  ctx.beginPath()
  ctx.arc(x, y, s * 1.8, 0, Math.PI * 2)
  ctx.fill()
}
