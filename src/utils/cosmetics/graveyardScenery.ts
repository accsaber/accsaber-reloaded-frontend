import { darken, lerpHex, lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { fillCircle, type Ctx } from '@/utils/cosmetics/canvasShapes'
import { offscreenLayer, softPuff, wrapX } from '@/utils/cosmetics/sceneLayer'

type Seed = (n: number) => number

const DRIFT_PUFFS = 48
const MARIA: [number, number, number][] = [[-0.3, -0.2, 0.28], [0.25, 0.15, 0.2], [-0.05, 0.45, 0.14], [0.35, -0.5, 0.1]]

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

export interface StoneField {
  count: number
  horizon: number
  depth: number
  size: [number, number]
  curve: number
}

export interface DriftSprite {
  img: HTMLCanvasElement
  w: number
  h: number
  y: number
  x0: number
  speed: number
}

export interface GraveSky {
  colors: string[]
  moon: string
  moonAt: [number, number]
  moonR: number
  stars: number
  starSize: [number, number]
  starBand: number
}

export function buildStones(field: StoneField, w: number, h: number, unit: number, seed: Seed): Stone[] {
  const out: Stone[] = []
  for (let i = 0; i < field.count; i++) {
    const u = Math.pow(seed(i * 3), field.curve)
    out.push({
      x: seed(i * 5) * w,
      y: h * (field.horizon + 0.06 + u * field.depth),
      s: unit * (field.size[0] + u * field.size[1]),
      kind: Math.floor(seed(i * 7) * 4),
      lean: (seed(i * 11) - 0.5) * 0.24,
    })
  }
  return out.sort((a, b) => a.y - b.y)
}

export function driftSprite(i: number, cw: number, ch: number, scale: number, color: string, density: number, seed: Seed): HTMLCanvasElement {
  const [c, ctx] = offscreenLayer(cw, ch, scale)
  if (!ctx) return c
  for (let k = 0; k <= DRIFT_PUFFS; k++) {
    const u = k / DRIFT_PUFFS
    const taper = Math.pow(Math.sin(u * Math.PI), 0.5)
    const x = cw * 0.05 + u * cw * 0.9
    const y = ch * 0.5 + (seed(i * 71 + k) - 0.5) * ch * 0.5
    softPuff(ctx, x, y, (cw / DRIFT_PUFFS) * (2.5 + seed(i * 97 + k) * 2), ch * (0.3 + seed(i * 53 + k) * 0.4) * taper, density * taper)
  }
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch)
  return c
}

export function drawDrift(ctx: Ctx, sprites: DriftSprite[], w: number, t: number, alpha: number): void {
  ctx.globalAlpha = alpha
  for (const sp of sprites) ctx.drawImage(sp.img, wrapX(sp.x0, sp.speed, t, w, sp.w), sp.y, sp.w, sp.h)
  ctx.globalAlpha = 1
}

export function drawGraveSky(ctx: Ctx, w: number, h: number, unit: number, sky: GraveSky, seed: Seed): void {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  sky.colors.forEach((c, i) => g.addColorStop(i / Math.max(1, sky.colors.length - 1), c))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < sky.stars; i++) {
    ctx.fillStyle = withAlpha(sky.moon, 0.15 + seed(i * 5) * 0.5)
    fillCircle(ctx, seed(i * 3) * w, seed(i * 7) * h * sky.starBand, unit * (sky.starSize[0] + seed(i * 11) * sky.starSize[1]))
  }
  const mx = w * sky.moonAt[0]
  const my = h * sky.moonAt[1]
  const r = sky.moonR * unit
  const halo = ctx.createRadialGradient(mx, my, r, mx, my, r * 3.5)
  halo.addColorStop(0, withAlpha(sky.moon, 0.16))
  halo.addColorStop(1, withAlpha(sky.moon, 0))
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = sky.moon
  fillCircle(ctx, mx, my, r)
  ctx.fillStyle = withAlpha(darken(sky.moon, 0.3), 0.3)
  for (const [ox, oy, rr] of MARIA) fillCircle(ctx, mx + ox * r, my + oy * r, rr * r)
}

export function batFlight(t: number, period: number, cross: number): { n: number; u: number } | null {
  const n = Math.floor(t / period)
  const phase = t - n * period
  return phase < cross ? { n, u: phase / cross } : null
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
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
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
  g.addColorStop(0, 'rgba(0, 0, 0, 0.35)')
  g.addColorStop(1, withAlpha(c.moon, 0.14))
  ctx.fillStyle = g
  ctx.fillRect(-st.s * 5, -st.s * 16, st.s * 10, st.s * 17)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'
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
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)'
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
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
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
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.fillRect(x - s * 3, y - s * 15.6, s * 6, s * 1.6)
  ctx.fillStyle = light
  ctx.fillRect(x - s * 1, y - s * 30, s * 2, s * 5)
  ctx.fillRect(x - s * 2.6, y - s * 28.6, s * 5.2, s * 1.2)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.lineWidth = Math.max(0.5, s * 0.22)
  ctx.beginPath()
  ctx.moveTo(x + s * 7, y - s * 17)
  ctx.lineTo(x + s * 6.2, y - s * 13.5)
  ctx.lineTo(x + s * 7.4, y - s * 10.5)
  ctx.stroke()
}

export function drawBranch(ctx: Ctx, x: number, y: number, ang: number, len: number, wdt: number, depth: number, k: number, seed: Seed): void {
  const ex = x + Math.cos(ang) * len
  const ey = y + Math.sin(ang) * len
  ctx.lineWidth = Math.max(0.6, wdt)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + Math.cos(ang + 0.35) * len * 0.5, y + Math.sin(ang + 0.35) * len * 0.5, ex, ey)
  ctx.stroke()
  if (depth === 0) return
  for (let i = 0; i < 2 + (seed(k * 17) < 0.4 ? 1 : 0); i++) {
    drawBranch(ctx, ex, ey, ang + (seed(k * 19 + i * 7) - 0.5) * 1.6, len * (0.55 + seed(k * 23 + i) * 0.25), wdt * 0.6, depth - 1, k * 31 + i + 1, seed)
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
  drawBranch(ctx, x - s * 3, y - s * 28, -Math.PI / 2 + 0.3, s * 16, s * 2, 4, k, seed)
  drawBranch(ctx, x + s * 0.5, y - s * 16, -0.3, s * 12, s * 1.4, 3, k * 77, seed)
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

function batWing(ctx: Ctx, f: number): void {
  ctx.moveTo(0, -0.1)
  ctx.quadraticCurveTo(-0.32, -0.42 - 0.3 * f, -1, -0.18 - 0.55 * f)
  ctx.quadraticCurveTo(-0.86, -0.12 - 0.42 * f, -0.68, 0.02 - 0.3 * f)
  ctx.quadraticCurveTo(-0.54, -0.04 - 0.2 * f, -0.38, 0.1 - 0.12 * f)
  ctx.quadraticCurveTo(-0.24, 0.06 - 0.05 * f, -0.08, 0.2)
  ctx.lineTo(0, 0.2)
  ctx.closePath()
}

export function drawBat(ctx: Ctx, x: number, y: number, size: number, dir: number, flap: number, color: string): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size * dir, size)
  ctx.fillStyle = color
  ctx.beginPath()
  batWing(ctx, flap)
  ctx.fill()
  ctx.save()
  ctx.scale(-1, 1)
  ctx.beginPath()
  batWing(ctx, flap)
  ctx.fill()
  ctx.restore()
  ctx.beginPath()
  ctx.ellipse(0, 0.02, 0.13, 0.24, 0, 0, Math.PI * 2)
  ctx.fill()
  fillCircle(ctx, 0, -0.17, 0.11)
  ctx.beginPath()
  ctx.moveTo(-0.11, -0.2)
  ctx.lineTo(-0.1, -0.4)
  ctx.lineTo(-0.02, -0.25)
  ctx.moveTo(0.11, -0.2)
  ctx.lineTo(0.1, -0.4)
  ctx.lineTo(0.02, -0.25)
  ctx.fill()
  ctx.restore()
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
