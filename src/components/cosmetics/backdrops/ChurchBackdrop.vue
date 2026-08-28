<script setup lang="ts">
import { useBackdropCanvas } from '@/composables/useCanvasScene'
import { type Ctx, fillCircle, fillPoly, flickerNoise, makeProjector, type Point, type Projector, sceneUnit } from '@/utils/cosmetics/canvasShapes'
import { darken, lerpHex, lighten } from '@/utils/color'
import { drawHorrorFace } from '@/utils/cosmetics/horrorFace'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { hash01, randBetween as rand } from '@/utils/random'
import { blitSceneLayer, paintSceneLayer } from '@/utils/cosmetics/sceneLayer'
import type { ChurchBackdropConfig } from '@/utils/cosmetics/themeBackdrop'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  config: ChurchBackdropConfig
}>()

interface Mote {
  x: number
  y: number
  speed: number
}

interface Flame {
  x: number
  y: number
  size: number
  phase: number
}

const STATIC_T = 5
const WINDOW_DEPTHS = [1.5, 3.1, 4.7, 6.3, 7.9, 9.5]
const WINDOW_SPAN = 0.9
const WIN_W = 60
const WIN_H = 120
const STRIPS = 36
const PEW_ROWS = 9
const FIGURE_PERIOD_S = 48
const ROW_Z0 = 2.1
const ROW_DZ = 0.8
const PEW_DEPTH = 0.34
const BACK_Y = 0.2
const SEAT_Y = 0.36
const ALTAR_Z = 11

let motes: Mote[] = []
let flames: Flame[] = []
let startTime = 0
let unit = 1
let seed = 0
let project: Projector = makeProjector(0, 0, 1)
let base: HTMLCanvasElement | null = null
let furniture: HTMLCanvasElement | null = null
let windowSprite: HTMLCanvasElement | null = null
let figLayer: HTMLCanvasElement | null = null

function h01(n: number): number {
  return hash01(seed + n)
}

function initScene(w: number, h: number) {
  unit = sceneUnit(w, h)
  seed = Math.floor(rand(0, 100000))
  project = makeProjector(w / 2, h * 0.42, w * 0.5)
  base = null
  furniture = null
  windowSprite = null
  motes = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), speed: rand(0.01, 0.03) }))
  flames = []
}

function figurePoint(): Point {
  return project(0, 0.5, ALTAR_Z - 1.4)
}

function lancetPath(o: Ctx, x: number, y: number, w: number, h: number): void {
  o.beginPath()
  o.moveTo(x, y + h)
  o.lineTo(x, y + w * 0.5)
  o.quadraticCurveTo(x, y + w * 0.05, x + w * 0.5, y)
  o.quadraticCurveTo(x + w, y + w * 0.05, x + w, y + w * 0.5)
  o.lineTo(x + w, y + h)
  o.closePath()
}

function paintLattice(o: Ctx, x: number, y: number, w: number, h: number, k: number): void {
  const colors = props.config.glassColors
  const cell = 7
  o.save()
  lancetPath(o, x, y, w, h)
  o.clip()
  for (let row = -1; row * cell < h + cell; row++) {
    for (let col = -1; col * cell < w + cell; col++) {
      const cx = x + col * cell + (row % 2 ? cell / 2 : 0)
      const cy = y + row * cell
      const idx = Math.floor(h01(k * 131 + row * 17 + col * 7) * colors.length)
      const bright = 0.55 + h01(k * 151 + row * 13 + col * 3) * 0.45
      o.fillStyle = withAlpha(colors[idx] ?? '#ffffff', bright)
      o.strokeStyle = withAlpha('#000000', 0.75)
      o.lineWidth = 0.8
      o.beginPath()
      o.moveTo(cx, cy - cell / 2)
      o.lineTo(cx + cell / 2, cy)
      o.lineTo(cx, cy + cell / 2)
      o.lineTo(cx - cell / 2, cy)
      o.closePath()
      o.fill()
      o.stroke()
    }
  }
  o.restore()
}

function paintRose(o: Ctx, cx: number, cy: number, r: number): void {
  const colors = props.config.glassColors
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2
    const a1 = ((i + 1) / 8) * Math.PI * 2
    o.fillStyle = withAlpha(colors[(i + 2) % colors.length] ?? '#ffffff', 0.85)
    o.beginPath()
    o.moveTo(cx, cy)
    o.arc(cx, cy, r, a0, a1)
    o.closePath()
    o.fill()
  }
  o.fillStyle = withAlpha(props.config.candleColor, 0.9)
  fillCircle(o, cx, cy, r * 0.3)
  o.strokeStyle = withAlpha('#000000', 0.8)
  o.lineWidth = 1
  o.beginPath()
  o.arc(cx, cy, r, 0, Math.PI * 2)
  o.stroke()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    o.beginPath()
    o.moveTo(cx, cy)
    o.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    o.stroke()
  }
}

function buildWindowSprite(scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.ceil(WIN_W * scale)
  c.height = Math.ceil(WIN_H * scale)
  const o = c.getContext('2d')
  if (!o) return c
  o.setTransform(scale, 0, 0, scale, 0, 0)
  o.fillStyle = darken(props.config.wallBottom, 0.5)
  lancetPath(o, 0, 0, WIN_W, WIN_H)
  o.fill()
  const mw = (WIN_W - 8) / 3
  for (let i = 0; i < 3; i++) paintLattice(o, 2 + i * (mw + 2), 30, mw, WIN_H - 32, i + 1)
  paintLattice(o, 10, 4, WIN_W - 20, 34, 9)
  paintRose(o, WIN_W / 2, 20, 11)
  o.strokeStyle = withAlpha('#000000', 0.9)
  o.lineWidth = 2
  lancetPath(o, 1, 1, WIN_W - 2, WIN_H - 2)
  o.stroke()
  for (let i = 0; i < 3; i++) {
    lancetPath(o, 2 + i * (mw + 2), 30, mw, WIN_H - 32)
    o.stroke()
  }
  return c
}

function drawWindow(ctx: Ctx, sd: number, z: number, t: number, k: number): void {
  if (!windowSprite) return
  const sw = windowSprite.width / STRIPS
  const depthGain = Math.min(1, 0.35 + z * 0.12)
  const shine = 0.55 + 0.25 * Math.sin(t * 0.11 + k * 1.7) + 0.2 * Math.sin(t * 0.043 + k)
  ctx.imageSmoothingQuality = 'high'
  for (let i = 0; i < STRIPS; i++) {
    const u0 = i / STRIPS
    const u1 = (i + 1) / STRIPS
    const zz0 = z + (sd > 0 ? u0 : 1 - u1) * WINDOW_SPAN
    const zz1 = z + (sd > 0 ? u1 : 1 - u0) * WINDOW_SPAN
    const top0 = project(sd * 1.2, -0.75, zz0)
    const top1 = project(sd * 1.2, -0.75, zz1)
    const bot0 = project(sd * 1.2, 0.12, zz0)
    const x0 = Math.min(top0[0], top1[0])
    const x1 = Math.max(top0[0], top1[0])
    const srcX = (STRIPS - 1 - i) * sw
    const dw = Math.max(1, x1 - x0)
    const pad = (dw / sw) * 2
    ctx.globalAlpha = depthGain * shine * 0.7
    ctx.drawImage(windowSprite, srcX - 2, 0, sw + 4, windowSprite.height, x0 - pad, Math.min(top0[1], top1[1]), dw + pad * 2, bot0[1] - top0[1])
  }
  ctx.globalAlpha = 1
}

function drawWalls(ctx: Ctx, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, props.config.wallTop)
  g.addColorStop(1, props.config.wallBottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = props.config.floorColor
  fillPoly(ctx, [project(-1.2, 0.5, 0.45), project(1.2, 0.5, 0.45), project(1.2, 0.5, 12), project(-1.2, 0.5, 12)])
  ctx.fillStyle = darken(props.config.floorColor, 0.35)
  for (const sd of [-1, 1]) {
    fillPoly(ctx, [project(sd * 1.2, -0.9, 0.45), project(sd * 1.2, 0.5, 0.45), project(sd * 1.2, 0.5, 12), project(sd * 1.2, -0.9, 12)])
  }
  ctx.strokeStyle = withAlpha('#000000', 0.35)
  ctx.lineWidth = Math.max(1, unit * 0.4)
  for (const z of [1, ...WINDOW_DEPTHS.map((d) => d + WINDOW_SPAN + 0.35)]) {
    for (const sd of [-1, 1]) {
      const a = project(sd * 1.2, -0.9, z)
      const b = project(sd * 1.2, 0.5, z)
      ctx.beginPath()
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
      ctx.stroke()
      const c = project(sd * 1.2, -0.9, z)
      const d = project(0, -1.35, z)
      ctx.beginPath()
      ctx.moveTo(c[0], c[1])
      ctx.quadraticCurveTo(c[0] + (d[0] - c[0]) * 0.5, d[1], d[0], d[1])
      ctx.stroke()
    }
  }
  const carpet = props.config.carpetColor
  ctx.fillStyle = carpet
  fillPoly(ctx, [project(-0.1, 0.5, 0.45), project(0.1, 0.5, 0.45), project(0.06, 0.5, ALTAR_Z), project(-0.06, 0.5, ALTAR_Z)])
  ctx.fillStyle = withAlpha(lighten(carpet, 0.35), 0.35)
  fillPoly(ctx, [project(-0.1, 0.5, 0.45), project(-0.085, 0.5, 0.45), project(-0.051, 0.5, ALTAR_Z), project(-0.06, 0.5, ALTAR_Z)])
  fillPoly(ctx, [project(0.085, 0.5, 0.45), project(0.1, 0.5, 0.45), project(0.06, 0.5, ALTAR_Z), project(0.051, 0.5, ALTAR_Z)])
}

function convexHull(points: Point[]): Point[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Point[] = []
  for (const pt of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop()
    lower.push(pt)
  }
  const upper: Point[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const pt = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop()
    upper.push(pt)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

function shaftFloorPoint(sd: number, y: number, z: number): Point {
  const t = (0.5 - y) / 1
  return project(sd * (1.2 - 0.9 * t), 0.5, z)
}

function drawLightShafts(ctx: Ctx) {
  for (const z of WINDOW_DEPTHS) {
    for (const sd of [-1, 1]) {
      const outline: Point[] = [project(sd * 1.2, 0.12, z), project(sd * 1.2, 0.12, z + WINDOW_SPAN), shaftFloorPoint(sd, 0.12, z), shaftFloorPoint(sd, 0.12, z + WINDOW_SPAN)]
      for (let i = 0; i <= 8; i++) {
        const u = i / 8
        const y = -0.5325 - 0.2175 * Math.pow(Math.sin(u * Math.PI), 0.75)
        outline.push(project(sd * 1.2, y, z + u * WINDOW_SPAN), shaftFloorPoint(sd, y, z + u * WINDOW_SPAN))
      }
      const from = project(sd * 1.2, -0.3, z + WINDOW_SPAN / 2)
      const to = project(sd * 0.45, 0.5, z + WINDOW_SPAN / 2)
      const g = ctx.createLinearGradient(from[0], from[1], to[0], to[1])
      g.addColorStop(0, withAlpha(props.config.candleColor, 0.08))
      g.addColorStop(1, withAlpha(props.config.candleColor, 0.01))
      ctx.fillStyle = g
      fillPoly(ctx, convexHull(outline))
    }
  }
}

function pewSeat(ctx: Ctx, x0: number, x1: number, z: number, wood: string): void {
  const a = project(x0, SEAT_Y, z + PEW_DEPTH * 0.3)
  const b = project(x1, SEAT_Y, z + PEW_DEPTH * 0.3)
  const c = project(x1, SEAT_Y, z + PEW_DEPTH)
  const d = project(x0, SEAT_Y, z + PEW_DEPTH)
  ctx.fillStyle = darken(wood, 0.25)
  fillPoly(ctx, [a, b, c, d])
}

function pewBack(ctx: Ctx, x0: number, x1: number, z: number, wood: string): void {
  const a = project(x0, 0.5, z)
  const b = project(x1, 0.5, z)
  const c = project(x1, BACK_Y, z)
  const d = project(x0, BACK_Y, z)
  const e = project(x1, BACK_Y, z + PEW_DEPTH * 0.3)
  const f = project(x0, BACK_Y, z + PEW_DEPTH * 0.3)
  ctx.fillStyle = wood
  fillPoly(ctx, [a, b, c, d])
  ctx.fillStyle = withAlpha(lighten(wood, 0.35), 0.55)
  fillPoly(ctx, [d, c, e, f])
  ctx.strokeStyle = withAlpha('#000000', 0.3)
  ctx.lineWidth = Math.max(0.5, unit * 0.15)
  for (const u of [0.3, 0.62]) {
    const p0 = project(x0, 0.5 + (BACK_Y - 0.5) * u, z)
    const p1 = project(x1, 0.5 + (BACK_Y - 0.5) * u, z)
    ctx.beginPath()
    ctx.moveTo(p0[0], p0[1])
    ctx.lineTo(p1[0], p1[1])
    ctx.stroke()
  }
}

function pewEnd(ctx: Ctx, x: number, z: number, wood: string): void {
  const a = project(x, 0.5, z)
  const b = project(x, 0.5, z + PEW_DEPTH)
  const c = project(x, 0.3, z + PEW_DEPTH)
  const d = project(x, 0.24, z + PEW_DEPTH * 0.5)
  const e = project(x, BACK_Y - 0.03, z)
  ctx.fillStyle = lighten(wood, 0.12)
  fillPoly(ctx, [a, b, c, d, e])
  ctx.strokeStyle = withAlpha('#000000', 0.45)
  ctx.lineWidth = Math.max(0.6, unit * 0.2)
  ctx.beginPath()
  ctx.moveTo(a[0], a[1])
  ctx.lineTo(b[0], b[1])
  ctx.lineTo(c[0], c[1])
  ctx.lineTo(d[0], d[1])
  ctx.lineTo(e[0], e[1])
  ctx.closePath()
  ctx.stroke()
}

function worshipper(ctx: Ctx, x: number, z: number, k: number): void {
  const bowed = h01(k * 7) < 0.5
  const sh = project(x, 0.27, z + 0.2)
  const r = unit * (2 + 0.6 * h01(k * 11)) * Math.min(1, 3.2 / z)
  ctx.fillStyle = props.config.figureColor
  ctx.beginPath()
  ctx.ellipse(sh[0], sh[1], r * 2.3, r * 2.2, 0, Math.PI, 0)
  ctx.fill()
  ctx.fillRect(sh[0] - r * 0.45, sh[1] - r * 2.8, r * 0.9, r * 1.4)
  ctx.beginPath()
  ctx.arc(sh[0] + (bowed ? r * 0.3 : 0), sh[1] - (bowed ? r * 2.7 : r * 3.3), r, 0, Math.PI * 2)
  ctx.fill()
}

function drawPews(ctx: Ctx) {
  const wood = props.config.pewColor
  for (let i = PEW_ROWS - 1; i >= 0; i--) {
    const z = ROW_Z0 + i * ROW_DZ
    const tone = i % 2 ? wood : lerpHex(wood, '#000000', 0.12)
    for (const sd of [-1, 1]) {
      const inner = sd * 0.14
      const outer = sd * 0.82
      const x0 = Math.min(inner, outer)
      const x1 = Math.max(inner, outer)
      pewSeat(ctx, x0, x1, z, tone)
      for (let sIdx = 0; sIdx < 4; sIdx++) {
        if (z < 5.6 && h01(i * 31 + sd * 5 + sIdx * 3) < 0.3) worshipper(ctx, inner + ((outer - inner) * (sIdx + 0.5)) / 4, z, i * 17 + sIdx + (sd > 0 ? 50 : 0))
      }
      pewBack(ctx, x0, x1, z, tone)
      pewEnd(ctx, inner, z, tone)
    }
  }
}

function chancelStep(ctx: Ctx, hw: number, zNear: number, zFar: number, top: string, front: string, y: number): void {
  const a = project(-hw, y, zNear)
  const b = project(hw, y, zNear)
  const c = project(hw, y, zFar)
  const d = project(-hw, y, zFar)
  const e = project(-hw, 0.5, zNear)
  const f = project(hw, 0.5, zNear)
  ctx.fillStyle = top
  fillPoly(ctx, [a, b, c, d])
  ctx.fillStyle = front
  fillPoly(ctx, [e, f, b, a])
}

function gablePanel(ctx: Ctx, x0: number, x1: number, yBase: number, yTop: number, z: number, fill: string): void {
  const l = project(x0, yBase, z)
  const r = project(x1, yBase, z)
  const lt = project(x0, yTop + (yBase - yTop) * 0.3, z)
  const rt = project(x1, yTop + (yBase - yTop) * 0.3, z)
  const t = project((x0 + x1) / 2, yTop, z)
  ctx.fillStyle = fill
  fillPoly(ctx, [l, lt, t, rt, r])
  ctx.fillRect(t[0] - unit * 0.35, t[1] - unit * 4, unit * 0.7, unit * 4)
}

function drawReredos(ctx: Ctx, stone: string): void {
  const z = ALTAR_Z + 0.9
  const panel = lighten(stone, 0.1)
  const niche = darken(stone, 0.45)
  gablePanel(ctx, -0.72, -0.3, 0.44, -0.55, z, panel)
  gablePanel(ctx, 0.3, 0.72, 0.44, -0.55, z, panel)
  gablePanel(ctx, -0.3, 0.3, 0.44, -0.95, z, lighten(stone, 0.16))
  gablePanel(ctx, -0.62, -0.4, 0.44, -0.3, z, niche)
  gablePanel(ctx, 0.4, 0.62, 0.44, -0.3, z, niche)
  gablePanel(ctx, -0.16, 0.16, 0.44, -0.6, z, niche)
  ctx.strokeStyle = withAlpha(props.config.candleColor, 0.35)
  ctx.lineWidth = Math.max(0.6, unit * 0.18)
  for (const px of [-0.72, -0.3, 0.3, 0.72]) {
    const pb = project(px, 0.44, z)
    const pt = project(px, -0.25, z)
    ctx.beginPath()
    ctx.moveTo(pb[0], pb[1])
    ctx.lineTo(pt[0], pt[1])
    ctx.stroke()
  }
  const nt = project(0, -0.6, z)
  const nb = project(0, 0.44, z)
  const cx = nt[0]
  const cy = (nt[1] + nb[1]) * 0.5
  const ch = (nb[1] - nt[1]) * 0.55
  ctx.fillStyle = lerpHex(props.config.candleColor, stone, 0.5)
  ctx.fillRect(cx - ch * 0.06, cy - ch * 0.5, ch * 0.12, ch)
  ctx.fillRect(cx - ch * 0.3, cy - ch * 0.22, ch * 0.6, ch * 0.11)
}

function drawRoseWindow(ctx: Ctx): void {
  const c = project(0, -1.25, ALTAR_Z + 0.9)
  const r = unit * 5
  const colors = props.config.glassColors
  const g = ctx.createRadialGradient(c[0], c[1], r * 0.5, c[0], c[1], r * 3)
  g.addColorStop(0, withAlpha(props.config.candleColor, 0.1))
  g.addColorStop(1, withAlpha(props.config.candleColor, 0))
  ctx.fillStyle = g
  ctx.fillRect(c[0] - r * 3, c[1] - r * 3, r * 6, r * 6)
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = withAlpha(colors[i % colors.length] ?? '#ffffff', 0.4)
    ctx.beginPath()
    ctx.moveTo(c[0], c[1])
    ctx.arc(c[0], c[1], r, (i / 12) * Math.PI * 2, ((i + 1) / 12) * Math.PI * 2)
    ctx.closePath()
    ctx.fill()
  }
  ctx.strokeStyle = withAlpha('#000000', 0.8)
  ctx.lineWidth = Math.max(0.6, unit * 0.22)
  for (const rr of [r, r * 0.62]) {
    ctx.beginPath()
    ctx.arc(c[0], c[1], rr, 0, Math.PI * 2)
    ctx.stroke()
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(c[0], c[1])
    ctx.lineTo(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r)
    ctx.stroke()
  }
  ctx.fillStyle = withAlpha(props.config.candleColor, 0.6)
  fillCircle(ctx, c[0], c[1], r * 0.18)
}

function drawCandelabrum(ctx: Ctx, x: number, z: number, dark: string): void {
  const base = project(x, 0.44, z)
  const scale = (unit * 5.5) / z
  const u = scale
  ctx.fillStyle = dark
  ctx.fillRect(base[0] - u * 0.7, base[1] - u * 26, u * 1.4, u * 26)
  ctx.fillRect(base[0] - u * 5, base[1] - u * 1, u * 10, u * 1.2)
  ctx.fillRect(base[0] - u * 7, base[1] - u * 26, u * 14, u * 1)
  for (const dx of [-6, 0, 6]) {
    const cy = base[1] - u * (33 - Math.abs(dx) * 0.4)
    ctx.fillStyle = lighten(props.config.faceColor, 0.2)
    ctx.fillRect(base[0] + dx * u - u * 0.6, cy, u * 1.2, u * (7 - Math.abs(dx) * 0.4))
    flames.push({ x: base[0] + dx * u, y: cy - u * 0.5, size: Math.max(0.5, u / unit), phase: h01(dx * 3 + x * 7) * 6 })
  }
}

function drawAltar(ctx: Ctx) {
  const stone = lerpHex(props.config.floorColor, props.config.wallBottom, 0.5)
  drawRoseWindow(ctx)
  drawReredos(ctx, stone)
  chancelStep(ctx, 1.1, ALTAR_Z - 1.2, ALTAR_Z + 0.9, lighten(stone, 0.12), darken(stone, 0.2), 0.47)
  chancelStep(ctx, 0.95, ALTAR_Z - 0.7, ALTAR_Z + 0.9, lighten(stone, 0.2), darken(stone, 0.1), 0.44)
  ctx.fillStyle = withAlpha(props.config.carpetColor, 0.85)
  fillPoly(ctx, [project(-0.06, 0.44, ALTAR_Z - 0.7), project(0.06, 0.44, ALTAR_Z - 0.7), project(0.05, 0.44, ALTAR_Z + 0.4), project(-0.05, 0.44, ALTAR_Z + 0.4)])
  const al = project(-0.3, 0.44, ALTAR_Z)
  const ar = project(0.3, 0.44, ALTAR_Z)
  const tl = project(-0.3, 0.12, ALTAR_Z)
  const tr = project(0.3, 0.12, ALTAR_Z)
  const bl = project(-0.3, 0.12, ALTAR_Z + 0.5)
  const br = project(0.3, 0.12, ALTAR_Z + 0.5)
  ctx.fillStyle = lighten(stone, 0.28)
  fillPoly(ctx, [al, ar, tr, tl])
  ctx.fillStyle = lighten(stone, 0.4)
  fillPoly(ctx, [tl, tr, br, bl])
  ctx.fillStyle = lighten(props.config.faceColor, 0.1)
  fillPoly(ctx, [[tl[0] - unit * 0.6, tl[1]], [tr[0] + unit * 0.6, tr[1]], [tr[0] + unit * 0.6, tr[1] + unit * 3.5], [tl[0] - unit * 0.6, tl[1] + unit * 3.5]])
  ctx.fillStyle = withAlpha(props.config.carpetColor, 0.9)
  fillPoly(ctx, [[tl[0] + (tr[0] - tl[0]) * 0.44, tl[1]], [tl[0] + (tr[0] - tl[0]) * 0.56, tl[1]], [tl[0] + (tr[0] - tl[0]) * 0.56, al[1]], [tl[0] + (tr[0] - tl[0]) * 0.44, al[1]]])
  ctx.fillStyle = lerpHex(props.config.candleColor, stone, 0.55)
  const tw = (tr[0] - tl[0]) * 0.14
  ctx.fillRect(tl[0] + (tr[0] - tl[0]) * 0.5 - tw / 2, tl[1] - tw * 0.9, tw, tw * 0.9)
  const dark = darken(stone, 0.45)
  drawCandelabrum(ctx, -0.55, ALTAR_Z - 0.2, dark)
  drawCandelabrum(ctx, 0.55, ALTAR_Z - 0.2, dark)
  const lb = project(0.78, 0.47, ALTAR_Z - 0.9)
  const lu = (unit * 5) / (ALTAR_Z - 0.9)
  ctx.fillStyle = dark
  ctx.fillRect(lb[0] - lu * 0.6, lb[1] - lu * 14, lu * 1.2, lu * 14)
  fillPoly(ctx, [[lb[0] - lu * 4, lb[1] - lu * 13], [lb[0] + lu * 4, lb[1] - lu * 15], [lb[0] + lu * 4, lb[1] - lu * 17], [lb[0] - lu * 4, lb[1] - lu * 15]])
  const rx = project(-1.15, 0.5, 8.6)
  const glow = ctx.createRadialGradient(rx[0] + 7 * unit, rx[1] - 11 * unit, 0, rx[0] + 7 * unit, rx[1] - 11 * unit, 18 * unit)
  glow.addColorStop(0, withAlpha(props.config.candleColor, 0.18))
  glow.addColorStop(1, withAlpha(props.config.candleColor, 0))
  ctx.fillStyle = glow
  ctx.fillRect(rx[0] - 12 * unit, rx[1] - 30 * unit, 38 * unit, 36 * unit)
  const shelf = lerpHex(stone, props.config.faceColor, 0.35)
  ctx.fillStyle = shelf
  ctx.fillRect(rx[0] - 1 * unit, rx[1] - 9.5 * unit, 16 * unit, 1.4 * unit)
  ctx.fillStyle = darken(shelf, 0.35)
  ctx.fillRect(rx[0] - 1 * unit, rx[1] - 8.1 * unit, 16 * unit, 1.2 * unit)
  ctx.fillRect(rx[0] + 0.5 * unit, rx[1] - 7 * unit, 1.2 * unit, 7 * unit)
  ctx.fillRect(rx[0] + 12.3 * unit, rx[1] - 7 * unit, 1.2 * unit, 7 * unit)
  for (let i = 0; i < 6; i++) {
    const cx = rx[0] + 1.5 * unit + i * 2.2 * unit
    const ch = (1.5 + h01(i * 5) * 2) * unit
    ctx.fillStyle = lighten(props.config.faceColor, 0.1)
    ctx.fillRect(cx - 0.5 * unit, rx[1] - 9.5 * unit - ch, 1 * unit, ch)
    flames.push({ x: cx, y: rx[1] - 9.9 * unit - ch, size: 0.55, phase: h01(i * 9) * 6 })
  }
}

function drawFlames(ctx: Ctx, t: number) {
  for (const f of flames) {
    const flick = 0.7 + flickerNoise(t + f.phase, 1.4) * 0.3
    const r = f.size * unit
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 7 * flick)
    g.addColorStop(0, withAlpha(props.config.candleColor, 0.28 * flick))
    g.addColorStop(1, withAlpha(props.config.candleColor, 0))
    ctx.fillStyle = g
    ctx.fillRect(f.x - r * 7, f.y - r * 7, r * 14, r * 14)
    ctx.fillStyle = withAlpha(props.config.candleColor, 0.9)
    ctx.beginPath()
    ctx.ellipse(f.x, f.y - r * 0.6, r * 0.55, r * (1 + 0.5 * flick), 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

interface FigureClip {
  x0: number
  x1: number
  y1: number
}

interface FigureFrame {
  x: number
  y: number
  k: number
  alpha: number
  crouch: boolean
  clip: FigureClip | null
  streak: number
}

function figureLayer(): HTMLCanvasElement {
  if (!figLayer) {
    figLayer = document.createElement('canvas')
    figLayer.width = 512
    figLayer.height = 512
  }
  return figLayer
}

function paintCrouched(o: Ctx, c: string, u: number): void {
  o.fillStyle = c
  o.strokeStyle = c
  o.lineCap = 'round'
  o.lineWidth = 3
  o.beginPath()
  o.ellipse(0, -12, 9, 11, 0.15, 0, Math.PI * 2)
  o.fill()
  for (const sd of [-1, 1]) {
    const sw = Math.sin(u * 6 + sd) * 0.6
    o.beginPath()
    o.moveTo(sd * 7, -17)
    o.lineTo(sd * 8 + sw, -6)
    o.lineTo(sd * 6, 0)
    o.stroke()
  }
  o.fillRect(-2.5, -22, 5, 6)
  o.beginPath()
  o.arc(0, -26, 6.5, 0, Math.PI * 2)
  o.fill()
}

function paintStanding(o: Ctx, c: string): void {
  o.fillStyle = c
  o.beginPath()
  o.moveTo(-9, 0)
  o.lineTo(-5, -46)
  o.lineTo(5, -46)
  o.lineTo(9, 0)
  o.closePath()
  o.fill()
  o.beginPath()
  o.arc(0, -51, 6.5, 0, Math.PI * 2)
  o.fill()
}

function paintFigure(seed: number, crouch: boolean, u: number): HTMLCanvasElement {
  const layer = figureLayer()
  const o = layer.getContext('2d')
  if (!o) return layer
  o.setTransform(1, 0, 0, 1, 0, 0)
  o.clearRect(0, 0, 512, 512)
  o.setTransform(4, 0, 0, 4, 256, 400)
  const c = props.config.figureColor
  if (crouch) paintCrouched(o, c, u)
  else paintStanding(o, c)
  const headY = crouch ? -26 : -51
  drawHorrorFace(o, 0, headY + 1, 12, seed, { figure: c, face: props.config.faceColor }, { hair: 1.9 })
  const veil = o.createLinearGradient(0, headY - 8, 0, headY + 6)
  veil.addColorStop(0, withAlpha(c, 0.95))
  veil.addColorStop(1, withAlpha(c, 0))
  o.globalCompositeOperation = 'source-atop'
  o.fillStyle = veil
  o.beginPath()
  o.ellipse(0, headY - 1, 9, 8, 0, 0, Math.PI * 2)
  o.fill()
  o.globalCompositeOperation = 'source-over'
  return layer
}

function rowZ(i: number): number {
  return ROW_Z0 + i * ROW_DZ
}

function figScale(z: number): number {
  return (unit * 2.4) / z
}

function aisleClip(z: number): FigureClip {
  return { x0: project(-0.14, 0.5, z)[0], x1: project(0.14, 0.5, z)[0], y1: project(0, 0.5, z)[1] }
}

function aboveBackClip(row: number): FigureClip {
  return { x0: 0, x1: 1e6, y1: project(0, BACK_Y, rowZ(row))[1] }
}

const PEEK_X = 0.42

function smooth(u: number): number {
  const c = Math.min(1, Math.max(0, u))
  return c * c * (3 - 2 * c)
}

interface Hop {
  row: number
  side: number
  start: number
  stare: number
}

function sinkSide(n: number): number {
  return h01(n * 3 + 1) < 0.5 ? -1 : 1
}

function hopPlan(n: number): Hop[] {
  const out: Hop[] = []
  let row = PEW_ROWS - 1
  let side = sinkSide(n)
  let t = 0
  let k = 0
  while (row >= 0) {
    const stare = 1.5 + h01(n * 7 + k) * 1.7
    out.push({ row, side, start: t, stare })
    t += (k === 0 ? 0.15 : 0.4 + h01(n * 11 + k) * 0.5) + 0.5 + stare + 0.35 + 0.3
    row -= h01(n * 17 + k) < 0.4 ? 2 : 1
    side = -side
    k++
  }
  return out
}

function hopFrame(u: number, n: number): FigureFrame | null {
  const plan = hopPlan(n)
  const idx = plan.findIndex((hp, i) => u >= hp.start && (i === plan.length - 1 || u < (plan[i + 1]?.start ?? Infinity)))
  const hop = plan[idx]
  if (!hop) return null
  const next = plan[idx + 1]
  const local = u - hop.start
  const pause = idx === 0 ? 0.15 : 0.4 + h01(n * 11 + idx) * 0.5
  const z = rowZ(hop.row) + 0.3
  const k = figScale(z)
  const pos = project(hop.side * PEEK_X, 0.5, z)
  const hidden = { x: pos[0], y: pos[1], k, alpha: 0, crouch: true, clip: null, streak: 0 }
  if (local < pause) return hidden
  const peek = local - pause
  const upEnd = 0.5
  const downStart = upEnd + hop.stare
  const downEnd = downStart + 0.35
  if (peek < downEnd) {
    const rise = peek < upEnd ? smooth(peek / upEnd) : peek < downStart ? 1 : 1 - smooth((peek - downStart) / 0.35)
    const clip = aboveBackClip(hop.row)
    const shownY = clip.y1 + k * 21
    const hiddenY = clip.y1 + k * 36
    return { x: pos[0], y: hiddenY + (shownY - hiddenY) * rise, k, alpha: 1, crouch: true, clip, streak: 0 }
  }
  if (!next) return null
  const dash = smooth((peek - downEnd) / 0.3)
  if (dash >= 1) return hidden
  const nz = rowZ(next.row) + 0.3
  const to = project(next.side * PEEK_X, 0.5, nz)
  const kk = figScale(z + (nz - z) * dash)
  return { x: pos[0] + (to[0] - pos[0]) * dash, y: pos[1] + (to[1] - pos[1]) * dash, k: kk, alpha: 1, crouch: true, clip: aisleClip(rowZ(next.row)), streak: 1 }
}

function standFrame(u: number, n: number): FigureFrame {
  const [ax, ay] = figurePoint()
  const zStand = ALTAR_Z - 1.4
  const ks = figScale(zStand)
  const clip = aboveBackClip(PEW_ROWS - 1)
  if (u < 3.2) return { x: ax, y: ay, k: ks, alpha: Math.min(1, u / 1.1) * 0.95, crouch: false, clip, streak: 0 }
  const p = smooth((u - 3.2) / 1.1)
  const side = sinkSide(n)
  const zTo = rowZ(PEW_ROWS - 1) + 0.3
  const to = project(side * PEEK_X, 0.5, zTo)
  const kk = figScale(zStand + (zTo - zStand) * p)
  const sunkY = clip.y1 + kk * 60
  return { x: ax + (to[0] - ax) * p, y: ay + (Math.max(to[1], sunkY) - ay) * p, k: kk, alpha: 1, crouch: false, clip, streak: 0 }
}

function figureFrame(t: number): { f: FigureFrame; n: number; u: number } | null {
  const n = Math.floor(t / FIGURE_PERIOD_S)
  const local = t - n * FIGURE_PERIOD_S
  const start = 6 + h01(n * 13) * 10
  const u = local - start
  if (u < 0) return null
  if (u < 4.3) return { f: standFrame(u, n), n, u }
  const hop = hopFrame(u - 4.3, n)
  return hop ? { f: hop, n, u } : null
}

function blitFigure(ctx: Ctx, f: FigureFrame, layer: HTMLCanvasElement, dx: number, alpha: number): void {
  const size = (f.k / 4) * 512
  ctx.globalAlpha = alpha
  ctx.drawImage(layer, f.x - size / 2 + dx, f.y - size * (400 / 512), size, size)
}

function drawFigure(ctx: Ctx, t: number) {
  const fr = figureFrame(t)
  if (!fr || fr.f.alpha <= 0) return
  const { f, n, u } = fr
  const layer = paintFigure(n * 7 + 3, f.crouch, u)
  ctx.save()
  if (f.clip) {
    ctx.beginPath()
    ctx.rect(f.clip.x0, 0, f.clip.x1 - f.clip.x0, f.clip.y1)
    ctx.clip()
  }
  if (f.streak > 0) {
    for (let i = 1; i <= 3; i++) blitFigure(ctx, f, layer, -i * f.k * 3 * f.streak, f.alpha * 0.18)
  }
  blitFigure(ctx, f, layer, 0, f.alpha)
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawDust(ctx: Ctx, w: number, h: number, t: number) {
  ctx.fillStyle = props.config.candleColor
  for (const m of motes) {
    const y = (m.y + t * m.speed) % 1
    ctx.globalAlpha = 0.25 * flickerNoise(t, m.speed * 40)
    fillCircle(ctx, m.x * w, y * h, 0.9 * unit)
  }
  ctx.globalAlpha = 1
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useBackdropCanvas(canvasRef, {
  init(w, h, now, scale) {
    startTime = now
    initScene(w, h)
    windowSprite = buildWindowSprite(Math.max(1, scale) * 2)
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startTime) / 1000
    if (!base) {
      base = paintSceneLayer(ctx, (lctx) => {
        drawWalls(lctx, w, h)
        drawLightShafts(lctx)
      })
    }
    if (!furniture) {
      flames = []
      furniture = paintSceneLayer(ctx, (lctx) => {
        drawAltar(lctx)
        drawPews(lctx)
      })
    }
    blitSceneLayer(ctx, base)
    WINDOW_DEPTHS.forEach((z, i) => {
      drawWindow(ctx, -1, z, t, i)
      drawWindow(ctx, 1, z, t, i + 6)
    })
    blitSceneLayer(ctx, furniture, 'source-over')
    drawFlames(ctx, t)
    if (props.config.figure && !reduced) drawFigure(ctx, t)
    if (props.config.dust) drawDust(ctx, w, h, t)
  },
})
</script>

<template>
  <canvas
    ref="canvas"
    class="church-backdrop"
    :style="{ opacity: config.opacity }"
    aria-hidden="true"
  />
</template>

<style scoped>
.church-backdrop {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  z-index: -1;
  pointer-events: none;
}
</style>
