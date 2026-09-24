<script setup lang="ts">
import { useBackdropCanvas } from '@/composables/useCanvasScene'
import { type Ctx, sceneUnit } from '@/utils/cosmetics/canvasShapes'
import { lerpHex } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { cloudMask, offscreenLayer, tintLayer, wrapX } from '@/utils/cosmetics/sceneLayer'
import { hash01, randBetween as rand } from '@/utils/random'
import type { DarkHourBackdropConfig } from '@/utils/cosmetics/themeBackdrop'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  config: DarkHourBackdropConfig
}>()

interface Band {
  canvas: HTMLCanvasElement
  top: number
  height: number
  scale: number
}

interface Cloud {
  dark: HTMLCanvasElement
  lit: HTMLCanvasElement
  w: number
  h: number
  y: number
  x0: number
  speed: number
}

interface Puddle {
  x: number
  y: number
  rx: number
  ry: number
  seed: number
}

interface Ripple {
  p: Puddle
  born: number
  u: number
  v: number
}

const STATIC_T = 5
const CLOUDS = 10
const PUFFS = 80
const HORIZON = 0.8
const MOON_X = 0.62
const MOON_Y = 0.22
const SQUASH = 0.35
const GRAIN = 2600
const RIPPLE_S = 1.6
const MOON_R = 22
const SKYLINE_RISE = 190
const LAMP_RISE = 24
const SOFT_SCALE = 0.5
const LAYERS = [
  { haze: 0.55, minH: 40, maxH: 110, minW: 14, maxW: 34, lift: 2 },
  { haze: 0.3, minH: 22, maxH: 74, minW: 10, maxW: 30, lift: 1 },
  { haze: 0, minH: 8, maxH: 40, minW: 8, maxW: 26, lift: 0 },
]

const litCloud = lerpHex(props.config.cloudColor, props.config.moonColor, 0.62)

let startTime = 0
let unit = 1
let seed = 0
let clouds: Cloud[] = []
let puddles: Puddle[] = []
let ripples: Ripple[] = []
let nextRipple = 0
let sky: Band | null = null
let skyline: Band | null = null
let mirrored: Band | null = null
let street: Band | null = null
let litLayer: HTMLCanvasElement | null = null
let litMask: HTMLCanvasElement | null = null

function h01(n: number): number {
  return hash01(seed + n)
}

function buildCloud(i: number, w: number, h: number, scale: number): Cloud {
  const cw = w * (0.5 + h01(i * 7) * 0.55)
  const ch = unit * (40 + h01(i * 11) * 40)
  const mask = cloudMask(cw, ch, scale * SOFT_SCALE, h01, i, PUFFS, 0.5)
  return {
    dark: tintLayer(mask, props.config.cloudColor),
    lit: tintLayer(mask, litCloud),
    w: cw,
    h: ch,
    y: h * (-0.04 + (i / CLOUDS) * 0.6) + (h01(i * 13) - 0.5) * unit * 16 - ch * 0.5,
    x0: h01(i * 17) * (w + cw),
    speed: (w / 150) * (0.5 + h01(i * 19) * 0.9),
  }
}

function bandLayer(w: number, top: number, bottom: number, scale: number, paint: (ctx: Ctx) => void): Band {
  const height = bottom - top
  const [canvas, ctx] = offscreenLayer(w, height, scale)
  if (ctx) {
    ctx.translate(0, -top)
    paint(ctx)
  }
  return { canvas, top, height, scale }
}

function blitBand(ctx: Ctx, band: Band | null, w: number): void {
  if (band) ctx.drawImage(band.canvas, 0, band.top, w, band.height)
}

function drawWindows(ctx: Ctx, x: number, top: number, bw: number, bh: number, k: number, haze: number, mirror: boolean): void {
  const cell = unit * 2.6
  const cols = Math.floor((bw - unit) / cell)
  const rows = Math.floor((bh - unit * 2) / cell)
  const litP = 0.05 + h01(k * 5) * 0.08
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = h01(k * 131 + r * 17 + c * 7)
      if (v > litP) continue
      const a = (0.22 + (v / litP) * 0.35) * (1 - haze * 0.7) * (mirror ? 2.2 : 1)
      ctx.fillStyle = withAlpha(props.config.windowColor, Math.min(1, a))
      ctx.fillRect(x + unit * 0.8 + c * cell, top + unit * 1.4 + r * cell, unit * 1.1, unit * 1.3)
    }
  }
}

function drawRoof(ctx: Ctx, x: number, top: number, bw: number, k: number, color: string): void {
  ctx.fillStyle = color
  const v = h01(k * 3)
  if (v < 0.3) {
    ctx.fillRect(x + bw * 0.2, top - unit * 3, unit * 3, unit * 3)
    ctx.fillRect(x + bw * 0.2 - unit * 0.4, top - unit * 3.6, unit * 3.8, unit * 0.7)
  } else if (v < 0.55) {
    ctx.fillRect(x + bw * 0.5 - unit * 0.25, top - unit * (6 + h01(k * 7) * 8), unit * 0.5, unit * 14)
  } else if (v < 0.8) {
    const tw = bw * (0.35 + h01(k * 7) * 0.4)
    ctx.fillRect(x + (bw - tw) * h01(k * 17), top - unit * (3 + h01(k * 19) * 7), tw, unit * 12)
  }
  ctx.fillRect(x - unit * 0.3, top - unit * 0.8, bw + unit * 0.6, unit * 0.8)
}

function drawBuilding(ctx: Ctx, x: number, bw: number, bh: number, base: number, k: number, haze: number, w: number, mirror: boolean): void {
  const body = mirror ? lerpHex(props.config.cityColor, props.config.waterColor, 0.5) : props.config.cityColor
  const far = mirror ? lerpHex(body, props.config.waterColor, 0.6) : (props.config.skyColors[1] ?? props.config.cityColor)
  const color = lerpHex(body, far, haze)
  const top = base - bh
  drawRoof(ctx, x, top, bw, k, color)
  ctx.fillStyle = color
  ctx.fillRect(x, top, bw, bh)
  drawWindows(ctx, x, top, bw, bh, k, haze, mirror)
  const rimX = x + (w * MOON_X > x + bw * 0.5 ? bw - unit * 0.35 : 0)
  ctx.fillStyle = withAlpha(props.config.moonColor, 0.12 * (1 - haze))
  ctx.fillRect(rimX, top, unit * 0.35, bh)
}

function drawTower(ctx: Ctx, x: number, base: number): void {
  ctx.fillStyle = lerpHex(props.config.cityColor, props.config.skyColors[1] ?? props.config.cityColor, 0.6)
  let y = base
  let bw = unit * 26
  for (let i = 0; i < 16; i++) {
    const bh = unit * (6 + h01(i * 23) * 5)
    const dx = (h01(i * 29) - 0.5) * unit * 7
    ctx.fillRect(x + dx - bw * 0.5, y - bh, bw, bh)
    ctx.fillRect(x + dx + bw * 0.5 - unit, y - bh * 0.5, unit * 2.5, unit * 0.6)
    y -= bh * 0.92
    bw *= 0.93
  }
  ctx.fillRect(x - unit * 0.6, y - unit * 16, unit * 1.2, unit * 16)
}

function paintSkyline(ctx: Ctx, w: number, h: number, mirror: boolean): void {
  const base = h * HORIZON
  drawTower(ctx, w * 0.3, base - unit * 10)
  LAYERS.forEach((L, li) => {
    let x = -unit * 6
    let k = li * 1000
    while (x < w + unit * 6) {
      const bw = unit * (L.minW + h01(k * 41) * (L.maxW - L.minW))
      const bh = unit * (L.minH + Math.pow(h01(k * 43), 1.4) * (L.maxH - L.minH))
      drawBuilding(ctx, x, bw, bh, base - unit * L.lift, k, L.haze, w, mirror)
      x += bw * (0.55 + h01(k * 47) * 0.5)
      k++
    }
  })
}

function puddlePoint(p: Puddle, k: number, n: number, dy: number): [number, number] {
  const a = (k / n) * Math.PI * 2
  const rr = 0.72 + 0.16 * Math.sin(a * 2 + p.seed * 9) + 0.08 * Math.sin(a * 5 + p.seed * 17) + 0.04 * Math.sin(a * 9 + p.seed * 3)
  return [p.x + Math.cos(a) * p.rx * rr, p.y + dy + Math.sin(a) * p.ry * rr]
}

function puddlePath(ctx: Ctx, p: Puddle, dy = 0): void {
  const n = 28
  const [lx, ly] = puddlePoint(p, n - 1, n, dy)
  let [qx, qy] = puddlePoint(p, 0, n, dy)
  ctx.beginPath()
  ctx.moveTo((lx + qx) / 2, (ly + qy) / 2)
  for (let k = 1; k <= n; k++) {
    const [nx, ny] = puddlePoint(p, k % n, n, dy)
    ctx.quadraticCurveTo(qx, qy, (qx + nx) / 2, (qy + ny) / 2)
    qx = nx
    qy = ny
  }
  ctx.closePath()
}

function dropOf(p: Puddle, i: number, d: number): Puddle {
  const side = h01(i * 101 + d) < 0.5 ? -1 : 1
  const rx = p.rx * (0.12 + h01(i * 109 + d) * 0.2)
  return {
    x: p.x + side * (p.rx + rx + p.rx * (0.15 + h01(i * 103 + d) * 0.4)),
    y: p.y + (h01(i * 107 + d) - 0.5) * p.ry * 1.5,
    rx,
    ry: p.ry * (0.25 + h01(i * 113 + d) * 0.3),
    seed: h01(i * 127 + d),
  }
}

function clear(p: Puddle, others: Puddle[]): boolean {
  return others.every((o) => Math.abs(o.x - p.x) > (o.rx + p.rx) * 1.8 || Math.abs(o.y - p.y) > (o.ry + p.ry) * 1.6)
}

function mainPuddle(i: number, k: number, w: number, h: number): Puddle {
  const y0 = h * HORIZON
  const u = Math.pow(h01(i * 91 + k * 7), 0.8)
  return {
    x: h01(i * 93 + k * 11) * w,
    y: y0 + unit * 2 + u * (h - y0 - unit * 4),
    rx: unit * (4 + u * 16) * (0.6 + h01(i * 95) * 0.8),
    ry: unit * (0.9 + u * 3.6),
    seed: h01(i * 97),
  }
}

function buildPuddles(w: number, h: number): Puddle[] {
  const mains: Puddle[] = []
  for (let i = 0; i < 12; i++) {
    for (let k = 0; k < 10; k++) {
      const p = mainPuddle(i, k, w, h)
      if (!clear(p, mains)) continue
      mains.push(p)
      break
    }
  }
  const out = [...mains]
  mains.forEach((p, i) => {
    const drops = Math.floor(h01(i * 99) * 3)
    for (let d = 0; d < drops; d++) out.push(dropOf(p, i, d))
  })
  return out
}

function drawLamp(ctx: Ctx, x: number, base: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(x - unit * 0.3, base - unit * 22, unit * 0.6, unit * 22)
  ctx.fillRect(x - unit * 0.3, base - unit * 22, unit * 3.5, unit * 0.5)
  ctx.fillRect(x + unit * 2.4, base - unit * 22, unit * 1.6, unit * 1.4)
  ctx.fillRect(x - unit * 1.2, base - unit * 1, unit * 2.4, unit * 1)
}

function drawGrain(ctx: Ctx, w: number, h: number): void {
  const y0 = h * HORIZON
  for (let i = 0; i < GRAIN; i++) {
    const y = y0 + Math.pow(h01(i * 11 + 3), 0.7) * (h - y0)
    const depth = (y - y0) / (h - y0)
    const s = unit * (0.15 + depth * 0.4)
    const dark = h01(i * 7 + 5) < 0.55
    ctx.fillStyle = dark ? 'rgba(0,0,0,0.2)' : withAlpha(props.config.moonColor, 0.04 + depth * 0.05)
    ctx.fillRect(h01(i * 13 + 1) * w, y, s * (1 + h01(i * 17) * 2), s)
  }
}

function drawCrack(ctx: Ctx, i: number, w: number, h: number): void {
  const y0 = h * HORIZON
  let x = h01(i * 131) * w
  let y = y0 + unit * 3 + h01(i * 137) * (h - y0 - unit * 6)
  const depth = (y - y0) / (h - y0)
  let dir = (h01(i * 149) - 0.5) * 1.2
  ctx.lineWidth = unit * (0.1 + depth * 0.25)
  ctx.beginPath()
  ctx.moveTo(x, y)
  const steps = 6 + Math.floor(h01(i * 139) * 6)
  for (let k = 0; k < steps; k++) {
    dir += (h01(i * 151 + k) - 0.5) * 1.1
    x += Math.cos(dir) * unit * (2 + depth * 3)
    y += Math.sin(dir) * unit * (0.5 + depth * 1.1)
    ctx.lineTo(x, y)
  }
  ctx.stroke()
}

function drawSheen(ctx: Ctx, w: number, h: number): void {
  const y0 = h * HORIZON
  const g = ctx.createLinearGradient(-1, 0, 1, 0)
  g.addColorStop(0, withAlpha(props.config.moonColor, 0))
  g.addColorStop(0.5, withAlpha(props.config.moonColor, 0.12))
  g.addColorStop(1, withAlpha(props.config.moonColor, 0))
  ctx.fillStyle = g
  for (let y = Math.floor(y0); y < h; y++) {
    const depth = (y - y0) / (h - y0)
    ctx.save()
    ctx.translate(w * MOON_X, y)
    ctx.scale(unit * (5 + depth * 34), 1)
    ctx.globalAlpha = 1 - depth * 0.7
    ctx.fillRect(-1, 0, 2, 1)
    ctx.restore()
  }
}

function paintStreet(ctx: Ctx, w: number, h: number): void {
  const y0 = h * HORIZON
  const asphalt = lerpHex(props.config.cityColor, props.config.waterColor, 0.22)
  const g = ctx.createLinearGradient(0, y0, 0, h)
  g.addColorStop(0, asphalt)
  g.addColorStop(1, lerpHex(asphalt, props.config.waterColor, 0.3))
  ctx.fillStyle = g
  ctx.fillRect(0, y0, w, h - y0)
  drawSheen(ctx, w, h)
  drawGrain(ctx, w, h)
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let i = 0; i < 7; i++) drawCrack(ctx, i, w, h)
  ctx.fillStyle = lerpHex(props.config.cityColor, props.config.moonColor, 0.14)
  ctx.fillRect(0, y0, w, unit * 1.6)
  ctx.fillStyle = withAlpha(props.config.moonColor, 0.08)
  ctx.fillRect(0, y0, w, unit * 0.4)
  ctx.fillStyle = withAlpha(props.config.moonColor, 0.05)
  for (let i = 0; i < 9; i++) ctx.fillRect(w * (i / 9) + unit * 2, y0 + (h - y0) * 0.55, unit * 14, unit * 0.5)
  const lamp = lerpHex(props.config.cityColor, props.config.moonColor, 0.08)
  for (let i = 0; i < 6; i++) drawLamp(ctx, w * (0.04 + i * 0.184 + h01(i * 3) * 0.05), y0 + unit * 1.6, lamp)
  for (const p of puddles) drawPuddleRim(ctx, p)
  for (const p of puddles) drawPuddleBed(ctx, p)
}

function drawSky(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h * HORIZON)
  const cs = props.config.skyColors
  cs.forEach((c, i) => g.addColorStop(i / Math.max(1, cs.length - 1), c))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h * HORIZON)
}

function drawMoon(ctx: Ctx, w: number, h: number): void {
  const mx = w * MOON_X
  const my = h * MOON_Y
  const r = unit * MOON_R
  const halo = ctx.createRadialGradient(mx, my, r * 0.8, mx, my, r * 3.4)
  halo.addColorStop(0, withAlpha(props.config.moonColor, 0.22))
  halo.addColorStop(0.4, withAlpha(props.config.moonColor, 0.07))
  halo.addColorStop(1, withAlpha(props.config.moonColor, 0))
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, w, h * HORIZON)
  ctx.fillStyle = props.config.moonColor
  ctx.beginPath()
  ctx.arc(mx, my, r, 0, Math.PI * 2)
  ctx.fill()
  const shade = lerpHex(props.config.moonColor, props.config.skyColors[0], 0.35)
  ctx.fillStyle = withAlpha(shade, 0.28)
  for (const [ox, oy, sr] of [[-0.3, -0.22, 0.26], [0.22, 0.08, 0.2], [-0.08, 0.42, 0.15], [0.44, 0.4, 0.09], [0.1, -0.5, 0.08]]) {
    ctx.beginPath()
    ctx.ellipse(mx + ox * r, my + oy * r, sr * r, sr * r * 0.8, 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  const limb = ctx.createRadialGradient(mx - r * 0.2, my - r * 0.2, r * 0.4, mx, my, r)
  limb.addColorStop(0, withAlpha(shade, 0))
  limb.addColorStop(1, withAlpha(shade, 0.45))
  ctx.fillStyle = limb
  ctx.beginPath()
  ctx.arc(mx, my, r, 0, Math.PI * 2)
  ctx.fill()
}

function litSize(): number {
  return unit * MOON_R * 7
}

function buildLitMask(scale: number): HTMLCanvasElement {
  const size = litSize()
  const [c, ctx] = offscreenLayer(size, size, scale)
  if (!ctx) return c
  const g = ctx.createRadialGradient(size * 0.5, size * 0.5, unit * MOON_R * 0.9, size * 0.5, size * 0.5, size * 0.5)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(0.15, 'rgba(0,0,0,0.5)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return c
}

function drawClouds(ctx: Ctx, w: number, h: number, t: number): void {
  for (const c of clouds) ctx.drawImage(c.dark, wrapX(c.x0, c.speed, t, w, c.w), c.y, c.w, c.h)
  const lctx = litLayer?.getContext('2d')
  if (!litLayer || !litMask || !lctx) return
  const size = litSize()
  const ox = w * MOON_X - size * 0.5
  const oy = h * MOON_Y - size * 0.5
  lctx.clearRect(0, 0, size, size)
  lctx.globalAlpha = 0.85
  for (const c of clouds) lctx.drawImage(c.lit, wrapX(c.x0, c.speed, t, w, c.w) - ox, c.y - oy, c.w, c.h)
  lctx.globalAlpha = 1
  lctx.globalCompositeOperation = 'destination-in'
  lctx.drawImage(litMask, 0, 0, size, size)
  lctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(litLayer, ox, oy, size, size)
}

function drawPuddleRim(ctx: Ctx, p: Puddle): void {
  puddlePath(ctx, p, -unit * 0.25)
  ctx.fillStyle = withAlpha(props.config.moonColor, 0.1)
  ctx.fill()
  puddlePath(ctx, p, unit * 0.22)
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fill()
}

function drawPuddleBed(ctx: Ctx, p: Puddle): void {
  puddlePath(ctx, p)
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.rx)
  g.addColorStop(0, lerpHex(props.config.waterColor, props.config.cityColor, 0.15))
  g.addColorStop(1, lerpHex(props.config.waterColor, props.config.moonColor, 0.1))
  ctx.fillStyle = g
  ctx.fill()
}

function drawReflection(ctx: Ctx, p: Puddle, h: number, t: number): void {
  if (!mirrored || p.rx < unit * 2) return
  const { canvas, top, scale } = mirrored
  const y0 = h * HORIZON
  const step = Math.max(1, unit * 0.75)
  const x0 = p.x - p.rx
  const sw = p.rx * 2
  ctx.globalAlpha = 0.7
  for (let y = p.y - p.ry; y < p.y + p.ry; y += step) {
    const srcY = y0 - (y - y0) / SQUASH - top
    const wob = Math.sin((y / unit) * 0.8 + t * 1.8 + p.seed * 12) * unit * 0.6
    ctx.drawImage(canvas, x0 * scale, (srcY - step / SQUASH) * scale, sw * scale, (step / SQUASH) * scale, x0 + wob, y, sw, step)
  }
  ctx.globalAlpha = 1
}

function drawMoonTrail(ctx: Ctx, p: Puddle, w: number, t: number): void {
  const mx = w * MOON_X
  const near = 1 - Math.min(1, Math.abs(p.x - mx) / (p.rx * 1.6))
  if (near <= 0) return
  ctx.fillStyle = props.config.moonColor
  ctx.globalAlpha = 0.35 * near
  for (let y = p.y - p.ry; y < p.y + p.ry; y += Math.max(1, unit * 0.35)) {
    const wob = Math.sin((y * 0.6) / unit + t * 2.2 + p.seed * 9) * unit * 1.2
    const half = unit * (1.5 + near * 4) * (0.6 + 0.4 * Math.sin((y * 1.1) / unit - t * 2.8))
    ctx.fillRect(mx + wob - half, y, half * 2, Math.max(1, unit * 0.2))
  }
  ctx.globalAlpha = 1
}

function stepRipples(t: number, reduced: boolean): void {
  ripples = ripples.filter((r) => t - r.born < RIPPLE_S)
  if (reduced || t < nextRipple) return
  const p = puddles[Math.floor(rand(0, puddles.length))]
  if (p && p.rx >= unit * 3) ripples.push({ p, born: t, u: rand(-0.5, 0.5), v: rand(-0.4, 0.4) })
  nextRipple = t + rand(0.7, 2.2)
}

function drawRipples(ctx: Ctx, t: number): void {
  for (const r of ripples) {
    const u = (t - r.born) / RIPPLE_S
    ctx.save()
    puddlePath(ctx, r.p)
    ctx.clip()
    ctx.strokeStyle = props.config.moonColor
    ctx.globalAlpha = 0.3 * (1 - u)
    ctx.lineWidth = Math.max(0.6, unit * 0.12)
    for (const lag of [0, 0.35]) {
      const uu = u - lag
      if (uu <= 0) continue
      ctx.beginPath()
      ctx.ellipse(r.p.x + r.u * r.p.rx, r.p.y + r.v * r.p.ry, r.p.rx * uu * 0.9, r.p.ry * uu * 0.9, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
  }
}

function drawPuddles(ctx: Ctx, w: number, h: number, t: number): void {
  for (const p of puddles) {
    ctx.save()
    puddlePath(ctx, p)
    ctx.clip()
    drawReflection(ctx, p, h, t)
    drawMoonTrail(ctx, p, w, t)
    ctx.restore()
  }
  drawRipples(ctx, t)
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

function layout(w: number, h: number, scale: number): void {
  unit = sceneUnit(w, h)
  ripples = []
  const base = h * HORIZON
  const rise = Math.max(0, base - unit * SKYLINE_RISE)
  clouds = Array.from({ length: CLOUDS }, (_, i) => buildCloud(i, w, h, scale))
  sky = bandLayer(w, 0, base, scale, (ctx) => {
    drawSky(ctx, w, h)
    drawMoon(ctx, w, h)
  })
  skyline = bandLayer(w, rise, base, scale, (ctx) => paintSkyline(ctx, w, h, false))
  mirrored = bandLayer(w, rise, base, scale * SOFT_SCALE, (ctx) => paintSkyline(ctx, w, h, true))
  puddles = buildPuddles(w, h)
  street = bandLayer(w, Math.max(0, base - unit * LAMP_RISE), h, scale, (ctx) => paintStreet(ctx, w, h))
  litLayer = offscreenLayer(litSize(), litSize(), scale)[0]
  litMask = buildLitMask(scale)
}

useBackdropCanvas(canvasRef, {
  init(w, h, now, scale) {
    startTime = now
    seed = Math.floor(rand(0, 100000))
    nextRipple = 1
    layout(w, h, scale)
  },
  resize(w, h, _now, scale) {
    layout(w, h, scale)
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    blitBand(ctx, sky, w)
    drawClouds(ctx, w, h, t)
    blitBand(ctx, skyline, w)
    blitBand(ctx, street, w)
    stepRipples(t, reduced)
    drawPuddles(ctx, w, h, t)
  },
})
</script>

<template>
  <canvas
    ref="canvas"
    :style="{ opacity: config.opacity }"
    aria-hidden="true"
  />
</template>
