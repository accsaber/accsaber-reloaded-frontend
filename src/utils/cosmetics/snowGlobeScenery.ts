import type { BorderSnowGlobeOverlaySpec, SnowGlobeScene } from '@/types/cosmetics/border'
import { sparkle } from '@/utils/cosmetics/canvasShapes'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { clamp, clamp01 } from '@/utils/math'
import { hash01, randBetween as rand } from '@/utils/random'

type Ctx = CanvasRenderingContext2D
type Palette = BorderSnowGlobeOverlaySpec

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

export const DOME = { x: 50, y: 49, r: 43 }

const TAU = Math.PI * 2

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

function ease(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * Math.min(1, rate * dt)
}

function smooth(u: number): number {
  return u * u * (3 - 2 * u)
}

function closeness(env: GlobeEnv, x: number, y: number, reach: number): number {
  if (!env.pointer) return 0
  return clamp01(1 - Math.hypot(env.pointer.x - x, env.pointer.y - y) / reach)
}

function poly(ctx: Ctx, pts: number[], color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
  ctx.closePath()
  ctx.fill()
}

function blob(ctx: Ctx, pts: number[], color: string): void {
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

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

function disc(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
}

function quadPoint(a: GlobePoint, c: GlobePoint, b: GlobePoint, t: number): GlobePoint {
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

function snowCap(ctx: Ctx, ridge: number[], thick: number, seed: number, color: string): void {
  const steps = 9
  const top: number[] = []
  const under: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = alongLine(ridge, t)
    const taper = Math.sin(Math.PI * t) ** 0.4
    top.push(p.x, p.y - thick * (0.7 + 0.5 * hash01(seed + i * 1.37)) * taper)
    under.unshift(p.x, p.y + thick * (0.15 + 1.1 * hash01(seed + 91 + i * 2.11) ** 3) * taper)
  }
  blob(ctx, [...top, ...under], color)
}

function pine(ctx: Ctx, env: GlobeEnv, x: number, h: number): void {
  const o = env.o
  const gy = groundY(x)
  ctx.fillStyle = o.ink
  ctx.fillRect(x - h * 0.035, gy - h * 0.18, h * 0.07, h * 0.18 + 1)
  for (let i = 0; i < 3; i++) {
    const top = gy - h + i * h * 0.25
    const half = h * (0.17 + i * 0.085)
    const bot = top + h * 0.4
    const dip = h * 0.05
    poly(ctx, [x, top, x + half, bot, x + half * 0.45, bot - dip, x, bot + dip * 0.4, x - half * 0.45, bot - dip, x - half, bot], o.pine)
    if (env.shed <= 0) continue
    const reach = 0.72
    const ridge = [x - half * reach, top + (bot - top) * reach, x, top - dip * 0.2, x + half * reach, top + (bot - top) * reach]
    snowCap(ctx, ridge, h * 0.06, x * 7 + i * 13, withAlpha(o.snow, env.shed))
  }
}

function smoke(ctx: Ctx, env: GlobeEnv, x: number, y: number, bend: number): void {
  for (let k = 0; k < 4; k++) {
    const u = (env.clock / 7 + k / 4) % 1
    ctx.fillStyle = withAlpha(env.o.shade, 0.38 * Math.sin(u * Math.PI))
    disc(ctx, x + Math.sin(u * 3 + k) * 0.9 * u + bend * u * u * 5, y - u * 8, 0.6 + u * 1.5)
  }
}

function cabin(ctx: Ctx, env: GlobeEnv, x: number, lit: number, bend: number): void {
  const o = env.o
  ctx.save()
  ctx.translate(x, groundY(x) + 0.5)
  ctx.scale(1.4, 1.4)
  ctx.fillStyle = o.ink
  ctx.fillRect(-6, -7, 12, 7)
  ctx.fillRect(2.6, -14, 2, 5)
  poly(ctx, [0, -12.5, 7.6, -6.6, -7.6, -6.6], o.accent)
  snowCap(ctx, [-8.2, -6.6, 0, -12.9, 8.2, -6.6], 1.5, 11, o.snow)
  snowCap(ctx, [2.1, -14, 5.1, -14], 0.9, 23, o.snow)
  ctx.fillStyle = withAlpha(o.light, 0.25 + 0.75 * lit * (0.92 + 0.08 * Math.sin(env.clock * 9)))
  ctx.fillRect(-4.2, -5.2, 2.8, 2.8)
  ctx.fillStyle = o.accent
  ctx.fillRect(1.2, -4.6, 2.4, 4.6)
  smoke(ctx, env, 3.6, -15, bend)
  ctx.restore()
}

const DEER_BODY = new Path2D(
  'M-5.2,-6.6 C-4.6,-8 -2,-8.2 0,-7.9 C1.8,-7.8 3.4,-7.9 4.3,-7.2 C5,-6.4 4.4,-5 3,-4.4 L3.2,0 L2.4,0 L2.1,-3.9 L1.5,-4 L1.3,0 L0.5,0 L0.6,-4.4 C-0.6,-4 -1.8,-4 -2.6,-4.3 L-2.8,0 L-3.6,0 L-3.5,-3.6 L-4.1,-4 L-4.6,0 L-5.4,0 L-5,-4.6 C-5.6,-5.2 -5.6,-6 -5.2,-6.6 Z',
)
const DEER_HEAD = new Path2D(
  'M0.3,-4.2 C0.6,-5.4 1.8,-5.8 2.6,-5.2 L4.4,-4.3 C4.7,-4.1 4.6,-3.6 4.2,-3.6 L2.6,-3.3 C1.6,-3.1 0.6,-3.4 0.3,-4.2 Z M0.9,-5.2 L0.2,-6.6 L1.6,-5.6 Z',
)
const DEER_ANTLER = new Path2D('M1.2,-5.6 C1,-7 0.4,-7.8 -0.4,-8.4 M0.9,-6.9 L1.9,-7.9 M0.4,-7.7 L0.9,-8.9')

function deerShape(ctx: Ctx, o: Palette, neck: number, nose?: string): void {
  ctx.fillStyle = o.body
  ctx.fill(DEER_BODY)
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
  ctx.fill(DEER_HEAD)
  ctx.strokeStyle = o.ink
  ctx.lineWidth = 0.4
  ctx.stroke(DEER_ANTLER)
  ctx.fillStyle = o.ink
  disc(ctx, 2.3, -4.5, 0.28)
  if (nose) {
    ctx.fillStyle = nose
    disc(ctx, 4.5, -4, 0.6)
  }
  ctx.restore()
}

function deer(ctx: Ctx, env: GlobeEnv, x: number, alert: number): void {
  ctx.save()
  ctx.translate(x, groundY(x) + 0.6)
  ctx.scale(1.2, 1.2)
  deerShape(ctx, env.o, (1 - smooth(alert)) * (1.75 + 0.08 * Math.sin(env.clock * 3)))
  ctx.restore()
}

function snowman(ctx: Ctx, env: GlobeEnv, x: number, look: number, wave: number): void {
  const o = env.o
  const side = look < 0 ? -1 : 1
  ctx.save()
  ctx.translate(x, groundY(x) + 1)
  ctx.scale(1.5, 1.5)
  ctx.strokeStyle = o.ink
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.6
  line(ctx, -2.8, -10, -7, -11.5 - wave * 2.6)
  line(ctx, 2.8, -10, 7, -11.5 - wave * 2.6)
  ctx.fillStyle = o.snow
  ctx.strokeStyle = o.shade
  ctx.lineWidth = 0.5
  for (const [y, r] of [[-3.6, 4.2], [-9.6, 3.1], [-14.3, 2.3]]) {
    disc(ctx, 0, y, r)
    ctx.stroke()
  }
  ctx.fillStyle = o.accent
  ctx.fillRect(-2.6, -12.6, 5.2, 1.3)
  ctx.fillRect(1.2, -12.6, 1.2, 3.4)
  ctx.fillStyle = o.ink
  ctx.fillRect(look * 0.4 - 1.1, -15.2, 0.6, 0.6)
  ctx.fillRect(look * 0.4 + 0.5, -15.2, 0.6, 0.6)
  poly(ctx, [look * 0.4, -14.4, look * 0.4 + side * 2.8, -13.9, look * 0.4, -13.5], o.light)
  ctx.restore()
}

interface Hat {
  state: 'on' | 'fly' | 'down' | 'back'
  x: number
  y: number
  vx: number
  vy: number
  a: number
  spin: number
  until: number
  fx: number
  fy: number
  fa: number
}

function stepHat(hat: Hat, env: GlobeEnv, homeX: number, homeY: number): void {
  if (hat.state === 'fly') {
    hat.vy += 60 * env.dt
    hat.x += hat.vx * env.dt
    hat.y += hat.vy * env.dt
    hat.a += hat.spin * env.dt
    keepInDome(hat, 5)
    if (hat.vy <= 0 || hat.y < env.surfaceY(hat.x) - 0.4) return
    hat.state = 'down'
    hat.until = env.clock + 1.6
    hat.a = hat.spin > 0 ? 0.5 : -0.5
  } else if (hat.state === 'down' && env.clock >= hat.until) {
    hat.state = 'back'
    hat.until = env.clock + 0.5
    hat.fx = hat.x
    hat.fy = hat.y
    hat.fa = hat.a
  } else if (hat.state === 'back') {
    const u = clamp01(1 - (hat.until - env.clock) / 0.5)
    const e = smooth(u)
    hat.x = hat.fx + (homeX - hat.fx) * e
    hat.y = hat.fy + (homeY - hat.fy) * e - Math.sin(u * Math.PI) * 8
    hat.a = hat.fa * (1 - e)
    if (u >= 1) hat.state = 'on'
  }
}

function drawHat(ctx: Ctx, env: GlobeEnv, hat: Hat, homeX: number, homeY: number): void {
  const on = hat.state === 'on'
  ctx.save()
  ctx.translate(on ? homeX : hat.x, on ? homeY : hat.y)
  ctx.rotate(on ? 0 : hat.a)
  ctx.scale(1.5, 1.5)
  ctx.fillStyle = env.o.ink
  ctx.fillRect(-2.9, 0.2, 5.8, 0.8)
  ctx.fillRect(-1.8, -2.8, 3.6, 3)
  ctx.fillStyle = env.o.accent
  ctx.fillRect(-1.8, -0.7, 3.6, 0.7)
  ctx.restore()
}

function nordic(): GlobeScene {
  const CABIN = 32
  const DEER = 54
  const MAN = 71
  const hatY = groundY(MAN) + 1 - 16.1 * 1.5
  const hat: Hat = { state: 'on', x: 0, y: 0, vx: 0, vy: 0, a: 0, spin: 0, until: 0, fx: 0, fy: 0, fa: 0 }
  let lit = 0
  let bend = 0
  let alert = 0
  let wave = 0
  let look = 0
  return {
    step(env) {
      const deerNear = closeness(env, DEER, groundY(DEER) - 6, 28) > 0
      lit = ease(lit, closeness(env, CABIN, groundY(CABIN) - 8, 30) > 0 ? 1 : 0, 6, env.dt)
      bend = ease(bend, clamp(env.swirl, -1, 1), 1.5, env.dt)
      alert = clamp01(alert + (deerNear ? env.dt / 0.7 : -env.dt / 1.4))
      wave = ease(wave, closeness(env, MAN, groundY(MAN) - 12, 26) > 0 ? 1 : 0, 6, env.dt)
      if (env.pointer) look = ease(look, clamp((env.pointer.x - MAN) / 12, -1, 1), 5, env.dt)
      stepHat(hat, env, MAN, hatY)
    },
    shake() {},
    press(_env, at) {
      if (hat.state !== 'on' || Math.hypot(at.x - MAN, at.y - (groundY(MAN) - 14)) > 12) return
      hat.state = 'fly'
      hat.x = MAN
      hat.y = hatY
      hat.vx = rand(-18, 18)
      hat.vy = -rand(34, 46)
      hat.spin = rand(-9, 9)
    },
    back(ctx, env) {
      pine(ctx, env, 18, 17)
      cabin(ctx, env, CABIN, lit, bend)
      pine(ctx, env, 46, 13)
      deer(ctx, env, DEER, alert)
      pine(ctx, env, 84, 15)
      snowman(ctx, env, MAN, look, wave)
      drawHat(ctx, env, hat, MAN, hatY)
    },
  }
}

const BUILDINGS: [number, number, number][] = [
  [7.5, 8, 20], [15, 7, 30], [21.5, 8, 22], [29, 6, 13], [65, 6, 12], [70.5, 8, 23], [78, 7, 32], [84.5, 8, 19],
]
const WINDOW_GAP = { x: 2.2, y: 3.1 }
const BUILDING_LIT_S = 7

function buildingTop(x: number, w: number, h: number): number {
  return groundY(x + w / 2) + 1 - h
}

function buildingAt(at: GlobePoint): number {
  return BUILDINGS.findIndex(([x, w, h]) => at.x >= x && at.x <= x + w && at.y >= buildingTop(x, w, h))
}

function windows(ctx: Ctx, env: GlobeEnv, share: number, raised: number[], lit: boolean): void {
  ctx.fillStyle = lit ? env.o.light : withAlpha(env.o.shade, 0.16)
  ctx.beginPath()
  BUILDINGS.forEach(([x, w, h], b) => {
    const cols = Math.floor((w - 1.6) / WINDOW_GAP.x)
    const rows = Math.floor((h - 3) / WINDOW_GAP.y)
    const pad = (w - (cols * WINDOW_GAP.x - 1)) / 2
    const wave = (env.clock - raised[b]) * 10
    for (let i = 0; i < cols * rows; i++) {
      const row = Math.floor(i / cols)
      const id = b * 97 + i
      const epoch = Math.floor(env.clock / (5 + hash01(id) * 9) + hash01(id + 0.5))
      const on = wave < BUILDING_LIT_S * 10 ? rows - 1 - row < wave : hash01(id * 3.1 + epoch * 7.7) < share
      if (on === lit) ctx.rect(x + pad + (i % cols) * WINDOW_GAP.x, buildingTop(x, w, h) + 2.2 + row * WINDOW_GAP.y, 1.2, 1.7)
    }
  })
  ctx.fill()
}

function skyline(ctx: Ctx, env: GlobeEnv, share: number, raised: number[]): void {
  ctx.fillStyle = env.o.ink
  for (const [x, w, h] of BUILDINGS) ctx.fillRect(x, buildingTop(x, w, h), w, h + 2)
  windows(ctx, env, share, raised, false)
  windows(ctx, env, share, raised, true)
  BUILDINGS.forEach(([x, w, h], b) => {
    const top = buildingTop(x, w, h)
    snowCap(ctx, [x - 0.5, top, x + w + 0.5, top], 1.3, b * 31 + 5, env.o.snow)
  })
}

function lamp(ctx: Ctx, env: GlobeEnv, x: number, lit: number): void {
  const o = env.o
  const gy = groundY(x)
  poly(ctx, [x - 1, gy - 13.1, x + 1, gy - 13.1, x + 5, gy + 1, x - 5, gy + 1], withAlpha(o.light, 0.08 + 0.2 * lit))
  ctx.fillStyle = o.body
  ctx.fillRect(x - 0.3, gy - 13.7, 0.6, 14.7)
  ctx.fillRect(x - 1.4, gy - 14.4, 2.8, 0.7)
  ctx.fillStyle = withAlpha(o.light, 0.45 + 0.55 * lit)
  ctx.fillRect(x - 1, gy - 13.7, 2, 0.6)
}

const FOUNTAIN = { x: 50, scale: 1.35, lift: 2.5, rim: 3.3 }

interface Drop {
  x: number
  y: number
  vx: number
  vy: number
}

const JET_TOP = -9.8

function jetReach(jet: number, burst: number): number {
  return 4 + 4 * jet + 7 * Math.sin(Math.PI * Math.sqrt(1 - burst))
}

function fountain(ctx: Ctx, env: GlobeEnv, jet: number, burst: number, bend: number, drops: Drop[]): void {
  const o = env.o
  const top = { x: 0, y: JET_TOP }
  const reach = jetReach(jet, burst)
  ctx.save()
  ctx.translate(FOUNTAIN.x, groundY(FOUNTAIN.x) - FOUNTAIN.lift)
  ctx.scale(FOUNTAIN.scale, FOUNTAIN.scale)
  ctx.fillStyle = o.body
  ctx.fillRect(-9, -2.6, 18, 4)
  ctx.fillRect(-9.6, -FOUNTAIN.rim, 19.2, 0.9)
  ctx.fillRect(-1, -9, 2, 6)
  poly(ctx, [-4, -9.6, 4, -9.6, 2.4, -8.2, -2.4, -8.2], o.body)
  ctx.fillStyle = o.water
  ctx.beginPath()
  ctx.ellipse(0, -FOUNTAIN.rim, 8.6, 0.9, 0, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = withAlpha(o.water, 0.8)
  ctx.lineCap = 'round'
  ctx.lineWidth = 0.7
  line(ctx, 0, top.y, bend * 2, top.y - reach)
  ctx.lineWidth = 0.45
  for (const k of [-2, -1, 1, 2]) {
    const peak = { x: k * 2.2 + bend * 2, y: top.y - reach * 0.9 }
    const end = { x: k * 3.6 + bend, y: -FOUNTAIN.rim }
    ctx.beginPath()
    ctx.moveTo(top.x, top.y)
    ctx.quadraticCurveTo(peak.x, peak.y, end.x, end.y)
    ctx.stroke()
    for (let j = 0; j < 2; j++) {
      const p = quadPoint(top, peak, end, (env.clock * 0.9 + j / 2 + k * 0.13) % 1)
      disc(ctx, p.x, p.y, 0.45)
    }
  }
  ctx.fillStyle = o.water
  for (const d of drops) disc(ctx, d.x, d.y, 0.5)
  ctx.restore()
}

function stepDrops(drops: Drop[], dt: number): Drop[] {
  for (const d of drops) {
    d.vy += 26 * dt
    d.x += d.vx * dt
    d.y += d.vy * dt
  }
  return drops.filter((d) => d.y < -FOUNTAIN.rim || d.vy < 0)
}

const PERCHES = [-7, -3.2, 3.6, 7.4]
const PIGEON_AWAY_S = 4.2

function pigeonAt(i: number, t: number, rimY: number): GlobePoint & { flying: boolean } {
  const perch = { x: FOUNTAIN.x + PERCHES[i] * FOUNTAIN.scale, y: rimY - 0.8 }
  if (t <= 0 || t >= PIGEON_AWAY_S) return { ...perch, flying: false }
  const sky = { x: FOUNTAIN.x + (i - 1.5) * 9, y: 38 + (i % 2) * 6 }
  const circle = { x: sky.x + Math.cos(t * 2.4 + i) * 3, y: sky.y + Math.sin(t * 2.4 + i) * 1.6 }
  const e = t < 1.2 ? smooth(t / 1.2) : t > 3 ? smooth((PIGEON_AWAY_S - t) / 1.2) : 1
  return { x: perch.x + (circle.x - perch.x) * e, y: perch.y + (circle.y - perch.y) * e, flying: true }
}

function pigeons(ctx: Ctx, env: GlobeEnv, fled: number): void {
  const rimY = groundY(FOUNTAIN.x) - FOUNTAIN.lift - FOUNTAIN.rim * FOUNTAIN.scale
  ctx.fillStyle = env.o.ink
  ctx.strokeStyle = env.o.ink
  ctx.lineWidth = 0.5
  ctx.lineCap = 'round'
  PERCHES.forEach((_, i) => {
    const bird = pigeonAt(i, env.clock - fled - i * 0.08, rimY)
    if (!bird.flying) {
      ctx.beginPath()
      ctx.ellipse(bird.x, bird.y, 1.2, 0.8, 0, 0, TAU)
      ctx.fill()
      disc(ctx, bird.x + (i % 2 ? 0.9 : -0.9), bird.y - 0.8, 0.5)
      return
    }
    const flap = Math.sin(env.clock * 22 + i) * 1.3
    line(ctx, bird.x - 1.7, bird.y - flap, bird.x, bird.y)
    line(ctx, bird.x, bird.y, bird.x + 1.7, bird.y - flap)
  })
}

function city(): GlobeScene {
  const LAMPS = [38, 62]
  const rimY = groundY(FOUNTAIN.x) - FOUNTAIN.lift - FOUNTAIN.rim * FOUNTAIN.scale
  const lit = [0, 0]
  const raised = BUILDINGS.map(() => -100)
  let glow = 0
  let jet = 0
  let burst = 0
  let blackout = 0
  let bend = 0
  let fled = -100
  let drops: Drop[] = []

  function scatter(env: GlobeEnv): void {
    if (env.clock - fled > PIGEON_AWAY_S + 1.5) fled = env.clock
  }

  return {
    step(env) {
      glow = ease(glow, env.pointer && inDome(env.pointer) ? 1 : 0, 4, env.dt)
      jet = ease(jet, closeness(env, FOUNTAIN.x, rimY - 4, 26) > 0 ? 1 : 0, 4, env.dt)
      bend = ease(bend, clamp(env.swirl, -1, 1), 2, env.dt)
      burst = Math.max(0, burst - env.dt / 2.6)
      drops = stepDrops(drops, env.dt)
      blackout = Math.max(0, blackout - env.dt)
      LAMPS.forEach((x, i) => {
        lit[i] = ease(lit[i], closeness(env, x, groundY(x) - 8, 18) > 0 ? 1 : 0, 6, env.dt)
      })
      if (closeness(env, FOUNTAIN.x, rimY, 10) > 0) scatter(env)
    },
    shake(env) {
      blackout = 1.4
      raised.fill(-100)
      scatter(env)
    },
    press(env, at) {
      const hit = buildingAt(at)
      if (hit >= 0) raised[hit] = env.clock
      if (Math.hypot(at.x - FOUNTAIN.x, at.y - (rimY - 4)) > 14) return
      burst = 1
      const y = JET_TOP - jetReach(jet, 1) * 0.8
      for (let i = 0; i < 14 && drops.length < 80; i++) drops.push({ x: 0, y, vx: rand(-8, 8), vy: -rand(4, 15) })
      scatter(env)
    },
    back(ctx, env) {
      skyline(ctx, env, blackout > 0 ? 0 : 0.3 + 0.45 * glow, raised)
      LAMPS.forEach((x, i) => lamp(ctx, env, x, blackout > 0 ? 0 : lit[i]))
    },
    front(ctx, env) {
      fountain(ctx, env, jet, burst, bend, drops)
      pigeons(ctx, env, fled)
    },
  }
}

const HOUSES: { x: number; s: number; roof: 'accent' | 'pine' }[] = [
  { x: 25, s: 1.25, roof: 'accent' },
  { x: 56, s: 1, roof: 'pine' },
  { x: 74, s: 1.3, roof: 'accent' },
]
const TREE = { x: 41, h: 20 }
const TREE_BULBS = [[-0.1, -0.78], [0.08, -0.62], [-0.16, -0.52], [0.14, -0.4], [-0.05, -0.36], [-0.22, -0.26], [0.2, -0.2], [0.02, -0.16]]
const RAIL = { from: 27, to: 73 }
const CAR_GAP = 5.6
const TRAIN_REST_S = 3.5
const TUNNEL = { mouth: 2.4, hide: 4.5 }
const SLEIGH_PERIOD_S = 12
const SLEIGH_FLIGHT_S = 6
const TEAM = [0.06, 0.115, 0.17]

function railY(x: number): number {
  return 78.4 + 1.1 * Math.sin((Math.PI * (x - RAIL.from)) / (RAIL.to - RAIL.from))
}

function rails(ctx: Ctx, env: GlobeEnv): void {
  ctx.strokeStyle = withAlpha(env.o.ink, 0.5)
  ctx.lineWidth = 0.5
  for (let x = RAIL.from + 1; x < RAIL.to; x += 2.6) line(ctx, x, railY(x) - 0.8, x, railY(x) + 0.6)
  ctx.strokeStyle = withAlpha(env.o.ink, 0.8)
  ctx.lineWidth = 0.4
  ctx.beginPath()
  for (let x = RAIL.from; x <= RAIL.to; x += 2) ctx.lineTo(x, railY(x))
  ctx.stroke()
}

function wheels(ctx: Ctx, color: string, xs: number[]): void {
  ctx.fillStyle = color
  for (const x of xs) disc(ctx, x, -0.6, 0.75)
}

function drawCar(ctx: Ctx, env: GlobeEnv, x: number, index: number): void {
  const o = env.o
  ctx.save()
  ctx.translate(x, railY(x))
  ctx.scale(1.25, 1.25)
  if (index === 0) {
    ctx.fillStyle = o.accent
    ctx.fillRect(-2.6, -3, 5.2, 2.2)
    ctx.fillStyle = o.pine
    ctx.fillRect(-2.6, -5, 2.2, 2.2)
    ctx.fillStyle = o.ink
    ctx.fillRect(1.2, -4.7, 0.9, 1.8)
    ctx.fillStyle = o.light
    disc(ctx, 2.5, -2.3, 0.45)
    wheels(ctx, o.ink, [-1.7, 0, 1.7])
  } else {
    ctx.fillStyle = index === 1 ? o.pine : o.light
    ctx.fillRect(-2.2, -2.8, 4.4, 2)
    ctx.fillStyle = o.accent
    ctx.fillRect(-1.4, -3.9, 1.2, 1.1)
    ctx.fillRect(0.3, -3.6, 1, 0.8)
    wheels(ctx, o.ink, [-1.3, 1.3])
  }
  ctx.restore()
}

function tunnel(ctx: Ctx, env: GlobeEnv, x: number, dir: number, cover: boolean): void {
  const o = env.o
  ctx.save()
  ctx.translate(x, railY(x) + 0.6)
  ctx.scale(dir, 1)
  if (cover) {
    blob(ctx, [-7.5, 2.5, -6.8, -5, -2.4, -10.6, 1.6, -10.4, TUNNEL.mouth, -5, TUNNEL.mouth, 2.5], o.snow)
    ctx.fillRect(-2, -8, TUNNEL.mouth + 2, 10.5)
  } else {
    blob(ctx, [-7.5, 2.5, -6.8, -5, -2.4, -10.6, 3.4, -9.6, 7, -4, 7.6, 2.5], o.snow)
    ctx.fillStyle = o.ink
    ctx.beginPath()
    ctx.ellipse(TUNNEL.mouth, 0.4, 2.6, 7.6, 0, Math.PI, TAU)
    ctx.fill()
  }
  ctx.restore()
}

function cottage(ctx: Ctx, env: GlobeEnv, x: number, s: number, roof: string, glow: number): void {
  const o = env.o
  ctx.save()
  ctx.translate(x, groundY(x) + 0.6)
  ctx.scale(s, s)
  ctx.fillStyle = o.body
  ctx.fillRect(-4.5, -6, 9, 6)
  poly(ctx, [0, -15, 6.2, -5.6, -6.2, -5.6], roof)
  snowCap(ctx, [-6.8, -5.6, 0, -15.4, 6.8, -5.6], 1.6, x, o.snow)
  ctx.fillStyle = o.ink
  ctx.fillRect(-1, -3.4, 2, 3.4)
  ctx.fillStyle = withAlpha(o.light, 0.4 + 0.6 * glow)
  disc(ctx, 0, -8.2, 1.2)
  ctx.fillRect(2, -4.6, 1.6, 1.6)
  ctx.restore()
}

function bulbAlpha(env: GlobeEnv, i: number, n: number, glow: number, flash: number): number {
  if (flash > 0) return Math.floor(env.clock * 10) % n === i % n ? 1 : 0.25
  return 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(env.clock * (2 + glow * 3) + i * 1.9))
}

function tree(ctx: Ctx, env: GlobeEnv, glow: number, flash: number): void {
  const o = env.o
  const gy = groundY(TREE.x)
  pine(ctx, env, TREE.x, TREE.h)
  TREE_BULBS.forEach(([dx, dy], i) => {
    ctx.fillStyle = withAlpha(o.lights[i % o.lights.length], bulbAlpha(env, i, TREE_BULBS.length, glow, flash))
    disc(ctx, TREE.x + dx * TREE.h, gy + dy * TREE.h, 0.7)
  })
  ctx.fillStyle = o.light
  sparkle(ctx, TREE.x, gy - TREE.h - 1, 2.2)
}

function garland(ctx: Ctx, env: GlobeEnv, a: GlobePoint, b: GlobePoint, glow: number, flash: number): void {
  const o = env.o
  const sag = { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) + 5 }
  ctx.strokeStyle = withAlpha(o.ink, 0.7)
  ctx.lineWidth = 0.3
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.quadraticCurveTo(sag.x, sag.y, b.x, b.y)
  ctx.stroke()
  for (let j = 1; j <= 5; j++) {
    const p = quadPoint(a, sag, b, j / 6)
    const id = j + Math.round(a.x)
    ctx.fillStyle = withAlpha(o.lights[id % o.lights.length], bulbAlpha(env, id, 5, glow, flash))
    disc(ctx, p.x, p.y + 0.4, 0.55)
  }
}

function roofPeak(i: number): GlobePoint {
  const h = HOUSES[i]
  return { x: h.x, y: groundY(h.x) + 0.6 - 15 * h.s }
}

function flightPose(u: number): GlobePoint & { angle: number } {
  const at = (v: number): GlobePoint => ({
    x: 6 + 88 * v,
    y: 25 - 7 * Math.sin(Math.PI * v) + 3.2 * Math.sin(v * 10 + 0.6),
  })
  const a = at(u)
  const b = at(u + 0.01)
  return { ...a, angle: Math.atan2(b.y - a.y, b.x - a.x) }
}

function sled(ctx: Ctx, o: Palette): void {
  poly(ctx, [-3.4, -2.6, -3.4, 0.2, 1.6, 0.2, 2.8, -1.2, 0.4, -1.2, 0.2, -2.6], o.accent)
  ctx.strokeStyle = o.light
  ctx.lineWidth = 0.35
  line(ctx, -3.8, 0.9, 2.4, 0.9)
  ctx.fillStyle = o.body
  disc(ctx, -2.6, -2.9, 1.1)
  ctx.fillStyle = o.accent
  disc(ctx, -0.9, -3.2, 0.95)
  ctx.fillStyle = o.snow
  disc(ctx, -0.5, -4, 0.45)
}

function sleigh(ctx: Ctx, env: GlobeEnv): void {
  const o = env.o
  const tau = (env.clock % SLEIGH_PERIOD_S) / SLEIGH_FLIGHT_S
  if (tau > 1.3) return
  const u = tau + 0.04 * Math.sin(tau * TAU * 2) - 0.12
  const seat = flightPose(u)
  const team = TEAM.map((ahead, i) => {
    const pose = flightPose(u + ahead)
    const stride = env.clock * 2.6 + i * 1.3
    return { x: pose.x, y: pose.y + 0.6 * Math.sin(stride), angle: pose.angle + 0.1 * Math.sin(stride + 1) }
  })
  ctx.fillStyle = o.light
  for (let k = 1; k <= 5; k++) {
    const p = flightPose(u - k * 0.03)
    sparkle(ctx, p.x - 3, p.y, (1 - k / 6) * 1.4 * (0.6 + 0.4 * Math.sin(env.clock * 9 + k)))
  }
  ctx.strokeStyle = withAlpha(o.ink, 0.8)
  ctx.lineWidth = 0.25
  ctx.beginPath()
  ctx.moveTo(seat.x, seat.y - 0.6)
  for (const deerPose of team) ctx.lineTo(deerPose.x, deerPose.y - 1)
  ctx.stroke()
  team.forEach((pose, i) => {
    ctx.save()
    ctx.translate(pose.x, pose.y)
    ctx.rotate(pose.angle)
    ctx.scale(0.34, 0.34)
    ctx.translate(0, 5)
    deerShape(ctx, o, 0.55, i === TEAM.length - 1 ? o.accent : undefined)
    ctx.restore()
  })
  ctx.save()
  ctx.translate(seat.x, seat.y)
  ctx.rotate(seat.angle)
  sled(ctx, o)
  ctx.restore()
}

interface Puff {
  x: number
  y: number
  born: number
}

function elven(): GlobeScene {
  const PUFF_LIFE_S = 1.4
  const TUNNELS: [number, number][] = [[RAIL.from - 1, 1], [RAIL.to + 1, -1]]
  const mouths = { from: RAIL.from - 1 + TUNNEL.mouth, to: RAIL.to + 1 - TUNNEL.mouth }
  let puffs: Puff[] = []
  let head = mouths.from - TUNNEL.hide
  let rest = rand(0, TRAIN_REST_S)
  let nextPuff = 0
  let boost = 0
  let glow = 0
  let flash = 0

  function stepTrain(env: GlobeEnv): void {
    if (rest > 0) {
      rest -= env.dt
      if (rest <= 0) head = mouths.from - TUNNEL.hide
      return
    }
    head += (11 + 14 * boost) * env.dt
    if (head - CAR_GAP * 2 > mouths.to + TUNNEL.hide) rest = TRAIN_REST_S
    if (env.clock < nextPuff || head < mouths.from + 3 || head > mouths.to - 3) return
    nextPuff = env.clock + (boost > 0 ? 0.12 : 0.35)
    puffs.push({ x: head + 2, y: railY(head) - 6, born: env.clock })
  }

  function drawTrain(ctx: Ctx, env: GlobeEnv): void {
    if (rest > 0) return
    ctx.save()
    ctx.beginPath()
    ctx.rect(mouths.from, 0, mouths.to - mouths.from, 100)
    ctx.clip()
    for (let i = 2; i >= 0; i--) drawCar(ctx, env, head - i * CAR_GAP, i)
    ctx.restore()
  }

  return {
    step(env) {
      boost = Math.max(0, boost - env.dt / 2)
      flash = Math.max(0, flash - env.dt / 1.5)
      glow = ease(glow, env.pointer && inDome(env.pointer) ? 1 : 0, 4, env.dt)
      puffs = puffs.filter((p) => env.clock - p.born < PUFF_LIFE_S)
      stepTrain(env)
    },
    shake() {
      flash = 1
    },
    press(_env, at) {
      const onTunnel = TUNNELS.some(([x]) => Math.hypot(at.x - x, at.y - railY(x) + 3) < 8)
      if (rest > 0 && onTunnel) rest = 0.01
      else if (rest <= 0 && Math.hypot(at.x - head, at.y - (railY(head) - 3)) < 9) boost = 1
      else if (Math.hypot(at.x - TREE.x, at.y - (groundY(TREE.x) - TREE.h / 2)) < 11) flash = 1
    },
    back(ctx, env) {
      sleigh(ctx, env)
      HOUSES.forEach((h) => cottage(ctx, env, h.x, h.s, env.o[h.roof], glow))
      tree(ctx, env, glow, flash)
      const treeTop = { x: TREE.x, y: groundY(TREE.x) - TREE.h + 2 }
      garland(ctx, env, roofPeak(0), treeTop, glow, flash)
      garland(ctx, env, treeTop, roofPeak(1), glow, flash)
      garland(ctx, env, roofPeak(1), roofPeak(2), glow, flash)
    },
    front(ctx, env) {
      rails(ctx, env)
      TUNNELS.forEach(([x, dir]) => tunnel(ctx, env, x, dir, false))
      drawTrain(ctx, env)
      TUNNELS.forEach(([x, dir]) => tunnel(ctx, env, x, dir, true))
      for (const p of puffs) {
        const age = (env.clock - p.born) / PUFF_LIFE_S
        ctx.fillStyle = withAlpha(env.o.shade, 0.7 * Math.sin(age * Math.PI))
        disc(ctx, p.x, p.y - age * 5, 0.7 + age * 1.6)
      }
    },
  }
}

const SCENES: Record<SnowGlobeScene, () => GlobeScene> = { nordic, city, elven }

export function createGlobeScene(kind: SnowGlobeScene): GlobeScene {
  return SCENES[kind]()
}
