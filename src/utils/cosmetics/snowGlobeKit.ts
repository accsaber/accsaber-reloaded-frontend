import type { BorderSnowGlobeOverlaySpec } from '@/types/cosmetics/border'
import { lazyPath, type Ctx } from '@/utils/cosmetics/canvasShapes'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { clamp01 } from '@/utils/math'
import { hash01 } from '@/utils/random'

export type Palette = BorderSnowGlobeOverlaySpec

export interface GlobePoint {
  x: number
  y: number
}

export interface GlobeEnv {
  o: Palette
  clock: number
  dt: number
  pointer: GlobePoint | null
  swirl: number
  shed: number
  surfaceY: (x: number) => number
}

export interface GlobeScene {
  step: (env: GlobeEnv) => void
  shake: (env: GlobeEnv) => void
  press: (env: GlobeEnv, at: GlobePoint) => void
  back: (ctx: Ctx, env: GlobeEnv) => void
  front?: (ctx: Ctx, env: GlobeEnv) => void
}

export interface Pine {
  x: number
  h: number
  tiers: number[][]
  caps: number[][]
}

export const DOME = { x: 50, y: 49, r: 43 }
export const GLASS = lazyPath('M26.48,85 A43,43 0 1 1 73.52,85 Z')
export const TAU = Math.PI * 2

const CAP_STEPS = 9
const DEER_BODY = lazyPath(
  'M-5.2,-6.6 C-4.6,-8 -2,-8.2 0,-7.9 C1.8,-7.8 3.4,-7.9 4.3,-7.2 C5,-6.4 4.4,-5 3,-4.4 L3.2,0 L2.4,0 L2.1,-3.9 L1.5,-4 L1.3,0 L0.5,0 L0.6,-4.4 C-0.6,-4 -1.8,-4 -2.6,-4.3 L-2.8,0 L-3.6,0 L-3.5,-3.6 L-4.1,-4 L-4.6,0 L-5.4,0 L-5,-4.6 C-5.6,-5.2 -5.6,-6 -5.2,-6.6 Z',
)
const DEER_HEAD = lazyPath(
  'M0.3,-4.2 C0.6,-5.4 1.8,-5.8 2.6,-5.2 L4.4,-4.3 C4.7,-4.1 4.6,-3.6 4.2,-3.6 L2.6,-3.3 C1.6,-3.1 0.6,-3.4 0.3,-4.2 Z M0.9,-5.2 L0.2,-6.6 L1.6,-5.6 Z',
)
const DEER_ANTLER = lazyPath('M1.2,-5.6 C1,-7 0.4,-7.8 -0.4,-8.4 M0.9,-6.9 L1.9,-7.9 M0.4,-7.7 L0.9,-8.9')

export function groundY(x: number): number {
  return 75.5 + 1.8 * Math.sin(x * 0.13 + 0.6) + 0.9 * Math.sin(x * 0.37 + 2)
}

export function inDome(p: GlobePoint): boolean {
  return Math.hypot(p.x - DOME.x, p.y - DOME.y) < DOME.r
}

export function keepInDome(p: { x: number; y: number; vx: number; vy: number }, pad: number): void {
  const ox = p.x - DOME.x
  const oy = p.y - DOME.y
  const d = Math.hypot(ox, oy)
  const lim = DOME.r - pad
  if (d <= lim) return
  const nx = ox / d
  const ny = oy / d
  p.x = DOME.x + nx * lim
  p.y = DOME.y + ny * lim
  const out = p.vx * nx + p.vy * ny
  if (out <= 0) return
  p.vx -= 1.6 * out * nx
  p.vy -= 1.6 * out * ny
}

export function ease(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * Math.min(1, rate * dt)
}

export function closeness(env: GlobeEnv, x: number, y: number, reach: number): number {
  if (!env.pointer) return 0
  return clamp01(1 - Math.hypot(env.pointer.x - x, env.pointer.y - y) / reach)
}

export function poly(ctx: Ctx, pts: number[], color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
  ctx.closePath()
  ctx.fill()
}

export function blob(ctx: Ctx, pts: number[], color: string): void {
  const n = pts.length / 2
  const mid = (i: number): [number, number] => {
    const j = (i + 1) % n
    return [(pts[i * 2] + pts[j * 2]) / 2, (pts[i * 2 + 1] + pts[j * 2 + 1]) / 2]
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(...mid(n - 1))
  for (let i = 0; i < n; i++) ctx.quadraticCurveTo(pts[i * 2], pts[i * 2 + 1], ...mid(i))
  ctx.fill()
}

export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

export function disc(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
}

export function quadPoint(a: GlobePoint, c: GlobePoint, b: GlobePoint, t: number): GlobePoint {
  const u = 1 - t
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
}

function alongLine(pts: number[], t: number): GlobePoint {
  const lengths: number[] = []
  let total = 0
  for (let i = 2; i < pts.length; i += 2) {
    total += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1])
    lengths.push(total)
  }
  const target = t * total
  const seg = Math.max(0, lengths.findIndex((l) => l >= target))
  const start = seg ? lengths[seg - 1] : 0
  const f = (target - start) / (lengths[seg] - start || 1)
  const i = seg * 2
  return { x: pts[i] + (pts[i + 2] - pts[i]) * f, y: pts[i + 1] + (pts[i + 3] - pts[i + 1]) * f }
}

export function snowCap(ridge: number[], thick: number, seed: number): number[] {
  const top: number[] = []
  const under: number[] = []
  for (let i = 0; i <= CAP_STEPS; i++) {
    const t = i / CAP_STEPS
    const p = alongLine(ridge, t)
    const taper = Math.sin(Math.PI * t) ** 0.4
    top.push(p.x, p.y - thick * (0.7 + 0.5 * hash01(seed + i * 1.37)) * taper)
    under.unshift(p.x, p.y + thick * (0.15 + 1.1 * hash01(seed + 91 + i * 2.11) ** 3) * taper)
  }
  return [...top, ...under]
}

export function makePine(x: number, h: number, count = 3, spread = 1): Pine {
  const gy = groundY(x)
  const dip = h * 0.05
  const reach = 0.72
  const tiers: number[][] = []
  const caps: number[][] = []
  const step = (h * 0.75) / count
  for (let i = 0; i < count; i++) {
    const top = gy - h + i * step
    const half = h * (0.17 + (i * 0.255) / count) * spread
    const bot = top + step * 1.6
    const shoulder = top + (bot - top) * reach
    tiers.push([x, top, x + half, bot, x + half * 0.45, bot - dip, x, bot + dip * 0.4, x - half * 0.45, bot - dip, x - half, bot])
    caps.push(snowCap([x - half * reach, shoulder, x, top - dip * 0.2, x + half * reach, shoulder], h * 0.06, x * 7 + i * 13))
  }
  return { x, h, tiers, caps }
}

export const CABIN_WINDOW: [number, number, number, number] = [-4.2, -5.2, 2.8, 2.8]
const ROOF_SNOW = snowCap([-8.2, -6.6, 0, -12.9, 8.2, -6.6], 1.5, 11)
const CHIMNEY_SNOW = snowCap([2.1, -14, 5.1, -14], 0.9, 23)

export function drawCabin(ctx: Ctx, o: Pick<Palette, 'ink' | 'accent' | 'snow' | 'light'>, lit: number): void {
  ctx.fillStyle = o.ink
  ctx.fillRect(-6, -7, 12, 7)
  ctx.fillRect(2.6, -14, 2, 5)
  poly(ctx, [0, -12.5, 7.6, -6.6, -7.6, -6.6], o.accent)
  blob(ctx, ROOF_SNOW, o.snow)
  blob(ctx, CHIMNEY_SNOW, o.snow)
  ctx.fillStyle = withAlpha(o.light, 0.25 + 0.75 * lit)
  ctx.fillRect(...CABIN_WINDOW)
  ctx.fillStyle = o.accent
  ctx.fillRect(1.2, -4.6, 2.4, 4.6)
}

export function drawSmoke(ctx: Ctx, color: string, clock: number, x: number, y: number, bend: number): void {
  for (let k = 0; k < 4; k++) {
    const u = (clock / 7 + k / 4) % 1
    ctx.fillStyle = withAlpha(color, 0.38 * Math.sin(u * Math.PI))
    disc(ctx, x + Math.sin(u * 3 + k) * 0.9 * u + bend * u * u * 5, y - u * 8, 0.6 + u * 1.5)
  }
}

export function drawPine(ctx: Ctx, pine: Pine, o: Pick<Palette, 'ink' | 'pine' | 'snow'>, shed: number): void {
  const snow = shed > 0 ? withAlpha(o.snow, shed) : null
  ctx.fillStyle = o.ink
  ctx.fillRect(pine.x - pine.h * 0.035, groundY(pine.x) - pine.h * 0.18, pine.h * 0.07, pine.h * 0.18 + 1)
  pine.tiers.forEach((tier, i) => {
    poly(ctx, tier, o.pine)
    if (snow) blob(ctx, pine.caps[i], snow)
  })
}

export function deerShape(ctx: Ctx, o: Palette, neck: number, nose?: string): void {
  ctx.fillStyle = o.body
  ctx.fill(DEER_BODY())
  ctx.fillStyle = o.snow
  disc(ctx, -5.3, -6.6, 0.7)
  ctx.save()
  ctx.translate(3.8, -6.9)
  ctx.rotate(neck)
  ctx.strokeStyle = o.body
  ctx.lineWidth = 2.1
  ctx.lineCap = 'round'
  line(ctx, 0, 0, 1.2, -3.9)
  ctx.fillStyle = o.body
  ctx.fill(DEER_HEAD())
  ctx.strokeStyle = o.ink
  ctx.lineWidth = 0.4
  ctx.stroke(DEER_ANTLER())
  deerFace(ctx, o.ink, nose)
  ctx.restore()
}

function deerFace(ctx: Ctx, ink: string, nose?: string): void {
  ctx.fillStyle = ink
  disc(ctx, 2.3, -4.5, 0.28)
  if (!nose) return
  ctx.fillStyle = nose
  disc(ctx, 4.5, -4, 0.6)
}
