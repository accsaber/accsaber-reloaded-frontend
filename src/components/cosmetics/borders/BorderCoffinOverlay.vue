<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { BorderCoffinOverlaySpec, BorderColorValue, CoffinMaterial } from '@/types/api/items'
import { darken, lighten } from '@/utils/color'
import { hash01 } from '@/utils/random'
import { overlaySpace, withAlpha, type OverlaySpace } from '@/utils/cosmetics/overlayCanvas'
import { randBetween as rand } from '@/utils/random'
import { onMounted, onUnmounted, useTemplateRef } from 'vue'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

const props = defineProps<{
  overlay: BorderCoffinOverlaySpec
  avatarUrl?: string | null
  color?: BorderColorValue | null
}>()

type Point = [number, number]

const MARGIN = 20
const WINDOW: Point[] = [[36, 2], [64, 2], [88, 24], [77, 98], [23, 98], [12, 24]]
const LID: Point[] = [[35, 0.5], [65, 0.5], [90, 23.5], [78.5, 99.5], [21.5, 99.5], [10, 23.5]]
const HINGE_X = 10
const SOIL_TOP = 88
const SOIL_BASE = 116
const SHUT_S = 0.5
const RISE_S = 0.5
const CREAK_S = 0.9
const PEEK_S = 0.9
const SLAM_S = 0.09
const WAIT_S = 0.8
const OPEN_S = 0.7
const KNOCK_S = 0.4
const CREAK_OPEN = 0.16

interface Mark {
  x: number
  y: number
  at: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  born: number
  life: number
}

interface Frame {
  open: number
  slam: boolean
  fingers: number
  shake: number
  holding: boolean
  seam: number
}

let clock = 0
let last = 0
let cycle = -1
let knocks: Mark[] = []
let marks: Mark[] = []
let dust: Particle[] = []
let sparks: Particle[] = []
let lastEvent = ''
let pointerInside = false
let pointerDirty = false
let pointer: { x: number; y: number } | null = null

function material(): CoffinMaterial {
  return props.overlay.material ?? 'oak'
}

function pal() {
  const o = props.overlay
  return {
    lid: o.lid ?? '#4a3320',
    trim: o.trim ?? '#c9a24a',
    seam: o.seam ?? '#f2b552',
    soil: o.soil ?? '#2a1a0e',
    root: o.root ?? '#3d2a16',
    bone: o.bone ?? '#e9e3d0',
  }
}

function interval(): number {
  return Math.max((props.overlay.intervalMs ?? 14000) / 1000, hold() + 6)
}

function hold(): number {
  return (props.overlay.holdMs ?? 5000) / 1000
}

function pulse(u: number): number {
  return u < 0 || u > 1 ? 0 : Math.sin(u * Math.PI)
}

function easeOut(u: number): number {
  return 1 - Math.pow(1 - u, 3)
}

function seedCycle(n: number): void {
  cycle = n
  marks = []
  const h = hold()
  knocks = [0.22, 0.5, 0.78].map((f, i) => ({
    x: 30 + hash01(n * 31 + i * 7) * 40,
    y: 22 + hash01(n * 53 + i * 11) * 55,
    at: SHUT_S + h * f + (hash01(n * 17 + i) - 0.5) * h * 0.12,
  }))
}

function frame(c: number): Frame {
  const h = hold()
  const tRise = SHUT_S + h
  const tCreak = tRise + RISE_S
  const tPeek = tCreak + CREAK_S
  const tSlam = tPeek + PEEK_S
  const tWait = tSlam + SLAM_S
  const tOpen = tWait + WAIT_S
  const tIdle = tOpen + OPEN_S
  if (c < SHUT_S) return { open: 1 - Math.pow(c / SHUT_S, 2.4), slam: false, fingers: 0, shake: 0, holding: false, seam: 0 }
  if (c < tRise) return { open: 0, slam: false, fingers: 0, shake: pulse((c - SHUT_S) / 0.25), holding: true, seam: 1 }
  if (c < tCreak) return { open: 0, slam: false, fingers: easeOut((c - tRise) / RISE_S), shake: 0, holding: false, seam: 1 }
  if (c < tPeek) {
    const u = (c - tCreak) / CREAK_S
    return { open: CREAK_OPEN * easeOut(u) + Math.sin(u * 40) * 0.006 * (1 - u), slam: false, fingers: 1, shake: 0, holding: false, seam: 1 - u }
  }
  if (c < tSlam) return { open: CREAK_OPEN + Math.sin(c * 30) * 0.004, slam: false, fingers: 1, shake: 0, holding: false, seam: 0 }
  if (c < tWait) return { open: CREAK_OPEN * (1 - (c - tSlam) / SLAM_S), slam: true, fingers: 1 - (c - tSlam) / SLAM_S, shake: 0, holding: false, seam: 0 }
  if (c < tOpen) return { open: 0, slam: false, fingers: 0, shake: pulse((c - tWait) / 0.3), holding: false, seam: 0.3 }
  if (c < tIdle) return { open: easeOut((c - tOpen) / OPEN_S), slam: false, fingers: 0, shake: 0, holding: false, seam: 0 }
  return { open: 1, slam: false, fingers: 0, shake: 0, holding: false, seam: 0 }
}

function knockLevel(c: number): { k: number; mark: Mark | null } {
  for (const kn of knocks) {
    const u = (c - kn.at) / KNOCK_S
    if (u >= 0 && u <= 1) return { k: pulse(u), mark: kn }
  }
  return { k: 0, mark: null }
}

function spawnDust(x0: number, x1: number, y: number, n: number, up: boolean): void {
  for (let i = 0; i < n; i++) {
    dust.push({ x: rand(x0, x1), y, vx: rand(-8, 8), vy: up ? rand(-30, -8) : rand(2, 10), born: clock, life: rand(0.5, 0.9) })
  }
}

function spawnSparks(x: number, y: number): void {
  for (let i = 0; i < 7; i++) {
    const a = rand(-2.6, -0.5)
    sparks.push({ x, y, vx: Math.cos(a) * rand(20, 50), vy: Math.sin(a) * rand(20, 50), born: clock, life: rand(0.25, 0.45) })
  }
}

function fireEvents(c: number, fr: Frame): void {
  const key = c < SHUT_S ? 'shut' : fr.holding ? 'hold' : fr.slam ? 'slam' : 'other'
  if (key === lastEvent) return
  lastEvent = key
  if (key === 'hold') spawnDust(20, 80, 2, 10, false)
  if (key === 'slam') spawnDust(14, 86, 3, 14, false)
}

function stepKnocks(c: number): void {
  const { k, mark } = knockLevel(c)
  if (!mark || k < 0.9 || marks.some((m) => m.at === mark.at)) return
  marks.push({ x: mark.x, y: mark.y, at: clock })
  spawnDust(mark.x - 12, mark.x + 12, 2, 4, false)
  if (material() === 'iron') spawnSparks(mark.x, 3)
}

function stepParticles(dt: number): void {
  for (const p of dust) {
    p.vy += 40 * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
  }
  for (const p of sparks) {
    p.vy += 120 * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
  }
  dust = dust.filter((p) => clock - p.born < p.life)
  sparks = sparks.filter((p) => clock - p.born < p.life)
}

function readPointer(canvas: HTMLCanvasElement): void {
  if (!pointerDirty) return
  pointerDirty = false
  if (!pointer) {
    pointerInside = false
    return
  }
  const rect = canvas.getBoundingClientRect()
  const nx = Math.abs(pointer.x - (rect.left + rect.width / 2)) / (rect.width / 1.4)
  const ny = Math.abs(pointer.y - (rect.top + rect.height / 2)) / (rect.height / 1.4)
  pointerInside = nx < 0.5 && ny < 0.5
}

function advance(dt: number): Frame {
  const c0 = clock % interval()
  const held = props.overlay.hover !== false && pointerInside && frame(c0).holding
  if (!held) clock += dt
  const c = clock % interval()
  const n = Math.floor(clock / interval())
  if (n !== cycle) seedCycle(n)
  const fr = frame(c)
  fireEvents(c, fr)
  if (!held) stepKnocks(c)
  stepParticles(dt)
  return held ? { ...fr, seam: 0, shake: 0 } : fr
}

function tracePoly(ctx: Ctx, sp: OverlaySpace, pts: Point[]): void {
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(sp.toX(x), sp.toY(y)) : ctx.moveTo(sp.toX(x), sp.toY(y))))
  ctx.closePath()
}

function lidTransform(ctx: Ctx, sp: OverlaySpace, open: number): void {
  if (material() === 'stone') {
    ctx.translate(0, open * 100 * sp.sy)
    return
  }
  const hx = sp.toX(HINGE_X)
  ctx.translate(hx, 0)
  ctx.scale(Math.max(0.03, 1 - open), 1)
  ctx.translate(-hx, 0)
}

function drawLidShadow(ctx: Ctx, sp: OverlaySpace, open: number): void {
  if (open <= 0.01 || open >= 0.98 || material() === 'stone') return
  const edge = HINGE_X + (90 - HINGE_X) * (1 - open)
  ctx.save()
  tracePoly(ctx, sp, WINDOW)
  ctx.clip()
  const g = ctx.createLinearGradient(sp.toX(edge), 0, sp.toX(edge + 10), 0)
  g.addColorStop(0, withAlpha('#000000', 0.55))
  g.addColorStop(1, withAlpha('#000000', 0))
  ctx.fillStyle = g
  ctx.fillRect(sp.toX(edge), sp.toY(0), sp.toX(edge + 10) - sp.toX(edge), sp.toY(100) - sp.toY(0))
  ctx.restore()
}

function drawPlanks(ctx: Ctx, sp: OverlaySpace, lid: string): void {
  ctx.strokeStyle = withAlpha(darken(lid, 0.45), 0.7)
  ctx.lineWidth = Math.max(0.6, 0.7 * sp.sx)
  for (let i = 1; i < 5; i++) {
    const x = 12 + i * 15.2
    ctx.beginPath()
    ctx.moveTo(sp.toX(x), sp.toY(0))
    ctx.lineTo(sp.toX(x + (i - 2.5) * 1.8), sp.toY(100))
    ctx.stroke()
  }
  ctx.strokeStyle = withAlpha(lighten(lid, 0.25), 0.35)
  for (let i = 0; i < 5; i++) {
    const x = 16 + i * 15.2
    ctx.beginPath()
    ctx.moveTo(sp.toX(x), sp.toY(6))
    ctx.quadraticCurveTo(sp.toX(x + 2), sp.toY(50), sp.toX(x - 1), sp.toY(94))
    ctx.stroke()
  }
}

function drawRivets(ctx: Ctx, sp: OverlaySpace, lid: string): void {
  ctx.fillStyle = lighten(lid, 0.3)
  for (let r = 0; r < 5; r++) {
    for (let cIdx = 0; cIdx < 3; cIdx++) {
      const y = 12 + r * 19
      const x = 28 + cIdx * 22 + (r % 2) * 11
      ctx.beginPath()
      ctx.arc(sp.toX(x), sp.toY(y), 1.3 * sp.sx, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.strokeStyle = withAlpha('#7a3a10', 0.6)
  ctx.lineWidth = Math.max(0.6, 1 * sp.sx)
  for (const [x, y] of [[39, 31], [72, 50]]) {
    ctx.beginPath()
    ctx.moveTo(sp.toX(x), sp.toY(y))
    ctx.lineTo(sp.toX(x + 0.6), sp.toY(y + 14))
    ctx.stroke()
  }
}

function drawRelief(ctx: Ctx, sp: OverlaySpace, lid: string): void {
  ctx.fillStyle = withAlpha(darken(lid, 0.35), 0.8)
  ctx.fillRect(sp.toX(47), sp.toY(18), 6 * sp.sx, 60 * sp.sy)
  ctx.fillRect(sp.toX(35), sp.toY(34), 30 * sp.sx, 6 * sp.sy)
  ctx.fillStyle = withAlpha(lighten(lid, 0.3), 0.5)
  ctx.fillRect(sp.toX(47), sp.toY(18), 1.5 * sp.sx, 60 * sp.sy)
  ctx.fillRect(sp.toX(35), sp.toY(34), 30 * sp.sx, 1.5 * sp.sy)
}

function drawGlassSheen(ctx: Ctx, sp: OverlaySpace, lid: string): void {
  ctx.strokeStyle = withAlpha(lighten(lid, 0.5), 0.5)
  ctx.lineWidth = Math.max(0.6, 2 * sp.sx)
  for (const off of [0, 9]) {
    ctx.beginPath()
    ctx.moveTo(sp.toX(20 + off), sp.toY(90))
    ctx.lineTo(sp.toX(62 + off), sp.toY(6))
    ctx.stroke()
  }
  ctx.fillStyle = withAlpha('#ffffff', 0.35)
  for (let i = 0; i < 14; i++) {
    ctx.beginPath()
    ctx.arc(sp.toX(18 + hash01(i * 3) * 64), sp.toY(10 + hash01(i * 5) * 80), (0.5 + hash01(i * 7)) * sp.sx, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawMaterial(ctx: Ctx, sp: OverlaySpace, lid: string): void {
  const m = material()
  if (m === 'oak') drawPlanks(ctx, sp, lid)
  else if (m === 'iron') drawRivets(ctx, sp, lid)
  else if (m === 'stone') drawRelief(ctx, sp, lid)
  else drawGlassSheen(ctx, sp, lid)
}

function drawBulge(ctx: Ctx, sp: OverlaySpace, m: Mark, k: number, lid: string): void {
  const r = (6 + k * 6) * sp.sx
  const g = ctx.createRadialGradient(sp.toX(m.x), sp.toY(m.y), 0, sp.toX(m.x), sp.toY(m.y), r)
  g.addColorStop(0, withAlpha(lighten(lid, 0.4), 0.6 * k))
  g.addColorStop(0.7, withAlpha(darken(lid, 0.4), 0.4 * k))
  g.addColorStop(1, withAlpha(lid, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(sp.toX(m.x), sp.toY(m.y), r, 0, Math.PI * 2)
  ctx.fill()
}

function drawHandprint(ctx: Ctx, sp: OverlaySpace, x: number, y: number, alpha: number): void {
  ctx.save()
  ctx.translate(sp.toX(x), sp.toY(y))
  ctx.scale(sp.sx * 1.4, sp.sy * 1.4)
  ctx.rotate(-0.2)
  ctx.fillStyle = withAlpha('#ffffff', alpha)
  ctx.beginPath()
  ctx.moveTo(4.4, -0.5)
  ctx.quadraticCurveTo(4.8, 4, 3.2, 7.2)
  ctx.quadraticCurveTo(0, 9, -3.2, 7.2)
  ctx.quadraticCurveTo(-4.8, 4, -4.4, -0.5)
  ctx.closePath()
  const lens = [6.6, 8, 7.6, 6.2]
  for (let i = 0; i < 4; i++) {
    const len = lens[i] ?? 7
    ctx.roundRect(-3.9 + i * 2.5 - 1.05, 1 - len, 2.1, len + 1, 1.05)
  }
  ctx.save()
  ctx.translate(3.6, 3.2)
  ctx.rotate(1.05)
  ctx.roundRect(-1.05, -6.4, 2.1, 7.4, 1.05)
  ctx.restore()
  ctx.fill()
  ctx.restore()
}

function drawMark(ctx: Ctx, sp: OverlaySpace, m: Mark, lid: string): void {
  const mat = material()
  const age = Math.min(1, (clock - m.at) / 0.6)
  if (mat === 'iron') {
    ctx.fillStyle = withAlpha(darken(lid, 0.5), 0.7)
    ctx.beginPath()
    ctx.ellipse(sp.toX(m.x), sp.toY(m.y), 5 * sp.sx, 3.5 * sp.sy, 0.4, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  if (mat === 'stone') {
    ctx.strokeStyle = withAlpha(darken(lid, 0.6), 0.85)
    ctx.lineWidth = Math.max(0.6, 0.8 * sp.sx)
    ctx.beginPath()
    ctx.moveTo(sp.toX(m.x), sp.toY(m.y))
    for (let i = 1; i <= 4; i++) ctx.lineTo(sp.toX(m.x + i * 3 * (i % 2 ? 1 : 0.4) * age), sp.toY(m.y - i * 4 * age + (i % 2) * 2))
    ctx.stroke()
    return
  }
  if (mat === 'glass') {
    drawHandprint(ctx, sp, m.x, m.y, 0.3 * (1 - age * 0.5))
    return
  }
  ctx.strokeStyle = withAlpha(lighten(lid, 0.45), 0.7)
  ctx.lineWidth = Math.max(0.5, 0.5 * sp.sx)
  for (let i = 0; i < 2; i++) {
    ctx.beginPath()
    ctx.moveTo(sp.toX(m.x - 1.5 + i * 3), sp.toY(m.y - 5))
    ctx.lineTo(sp.toX(m.x - 0.5 + i * 3), sp.toY(m.y + 6))
    ctx.stroke()
  }
}

function drawLid(ctx: Ctx, sp: OverlaySpace, fr: Frame, c: number): void {
  if (fr.open >= 0.98) return
  const p = pal()
  const { k, mark } = knockLevel(c)
  const rattle = fr.holding ? k * 0.8 : 0
  ctx.save()
  ctx.beginPath()
  ctx.rect(sp.toX(-20), sp.toY(-20), sp.toX(120) - sp.toX(-20), sp.toY(SOIL_BASE - 2) - sp.toY(-20))
  ctx.clip()
  ctx.translate(Math.sin(clock * 90) * rattle * sp.sx + Math.sin(clock * 70) * fr.shake * 1.5 * sp.sx, Math.cos(clock * 80) * fr.shake * sp.sy)
  lidTransform(ctx, sp, fr.open)
  tracePoly(ctx, sp, LID)
  ctx.clip()
  const glass = material() === 'glass'
  ctx.fillStyle = glass ? withAlpha(p.lid, 0.4) : p.lid
  ctx.fillRect(sp.toX(0), sp.toY(-2), sp.toX(100) - sp.toX(0), sp.toY(102) - sp.toY(-2))
  drawMaterial(ctx, sp, p.lid)
  for (const m of marks) drawMark(ctx, sp, m, p.lid)
  if (mark && k > 0 && !glass) drawBulge(ctx, sp, mark, k, p.lid)
  ctx.strokeStyle = p.trim
  ctx.lineWidth = Math.max(0.8, 1.6 * sp.sx)
  tracePoly(ctx, sp, LID)
  ctx.stroke()
  ctx.restore()
}

function drawSeam(ctx: Ctx, sp: OverlaySpace, fr: Frame, c: number): void {
  if (fr.seam <= 0 || fr.open > 0.02) return
  const { k } = knockLevel(c)
  const flicker = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(clock * 23) * Math.sin(clock * 9.3)) * (0.6 + k)
  ctx.strokeStyle = withAlpha(pal().seam, 0.85 * fr.seam * flicker)
  ctx.lineWidth = Math.max(0.6, 0.9 * sp.sx)
  ctx.beginPath()
  ctx.moveTo(sp.toX(78.5), sp.toY(99.5))
  ctx.lineTo(sp.toX(90), sp.toY(23.5))
  ctx.lineTo(sp.toX(65), sp.toY(0.5))
  ctx.stroke()
}

function drawFinger(ctx: Ctx, sp: OverlaySpace, x: number, y: number, angle: number, len: number, bone: string): void {
  ctx.save()
  ctx.translate(sp.toX(x), sp.toY(y))
  ctx.rotate(angle)
  ctx.fillStyle = bone
  ctx.beginPath()
  ctx.roundRect(0, -2.1 * sp.sy, len * 0.62 * sp.sx, 4.2 * sp.sy, 2 * sp.sx)
  ctx.fill()
  ctx.translate(len * 0.55 * sp.sx, 0)
  ctx.rotate(0.55)
  ctx.beginPath()
  ctx.roundRect(0, -1.9 * sp.sy, len * 0.45 * sp.sx, 3.8 * sp.sy, 1.9 * sp.sx)
  ctx.fill()
  ctx.fillStyle = withAlpha('#000000', 0.35)
  ctx.fillRect(0, -1.5 * sp.sy, 0.8 * sp.sx, 3 * sp.sy)
  ctx.restore()
}

function drawFingers(ctx: Ctx, sp: OverlaySpace, fr: Frame): void {
  if (fr.fingers <= 0) return
  const bone = pal().bone
  const len = 3 + fr.fingers * 7
  if (material() === 'stone') {
    const top = 0.5 + fr.open * 100
    for (let i = 0; i < 4; i++) drawFinger(ctx, sp, 38 + i * 8, top - 1, Math.PI / 2, len * (1 - Math.abs(i - 1.5) * 0.12), bone)
    return
  }
  const edge = HINGE_X + (90 - HINGE_X) * (1 - fr.open)
  for (let i = 0; i < 4; i++) drawFinger(ctx, sp, edge + 1, 38 + i * 9, Math.PI, len * (1 - Math.abs(i - 1.5) * 0.12), bone)
}

function drawSoil(ctx: Ctx, sp: OverlaySpace, c: number): void {
  const p = pal()
  const creep = Math.min(1, c / interval())
  ctx.fillStyle = p.soil
  ctx.beginPath()
  ctx.moveTo(sp.toX(-10), sp.toY(SOIL_BASE))
  for (let i = 0; i <= 24; i++) {
    const u = i / 24
    const x = -10 + u * 120
    const dome = Math.pow(Math.sin(u * Math.PI), 0.3)
    ctx.lineTo(sp.toX(x), sp.toY(SOIL_BASE - (SOIL_BASE - SOIL_TOP) * dome + Math.sin(i * 1.9) * 1.2 + Math.sin(i * 0.7) * 1))
  }
  ctx.lineTo(sp.toX(110), sp.toY(SOIL_BASE))
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = withAlpha(p.root, 0.9)
  ctx.lineCap = 'round'
  for (let i = 0; i < 4; i++) {
    const x = 18 + i * 21
    const len = (6 + hash01(i * 13) * 12) * creep
    ctx.lineWidth = Math.max(0.6, (1.6 - i * 0.1) * sp.sx)
    ctx.beginPath()
    ctx.moveTo(sp.toX(x), sp.toY(SOIL_TOP + 2))
    ctx.quadraticCurveTo(sp.toX(x + (i % 2 ? 6 : -6)), sp.toY(SOIL_TOP - len * 0.5), sp.toX(x + (i % 2 ? -3 : 4)), sp.toY(SOIL_TOP - len))
    ctx.stroke()
  }
}

function drawParticles(ctx: Ctx, sp: OverlaySpace): void {
  const p = pal()
  for (const d of dust) {
    const u = (clock - d.born) / d.life
    ctx.fillStyle = withAlpha(lighten(p.soil, 0.35), 0.7 * (1 - u))
    ctx.beginPath()
    ctx.arc(sp.toX(d.x), sp.toY(d.y), (0.6 + u * 0.8) * sp.sx, 0, Math.PI * 2)
    ctx.fill()
  }
  for (const s of sparks) {
    const u = (clock - s.born) / s.life
    ctx.strokeStyle = withAlpha(p.seam, 1 - u)
    ctx.lineWidth = Math.max(0.5, 0.7 * sp.sx)
    ctx.beginPath()
    ctx.moveTo(sp.toX(s.x), sp.toY(s.y))
    ctx.lineTo(sp.toX(s.x - s.vx * 0.03), sp.toY(s.y - s.vy * 0.03))
    ctx.stroke()
  }
}

function drawScene(ctx: Ctx, w: number, h: number, fr: Frame, c: number): void {
  const sp = overlaySpace(w, h, MARGIN)
  drawLidShadow(ctx, sp, fr.open)
  drawLid(ctx, sp, fr, c)
  drawSeam(ctx, sp, fr, c)
  drawFingers(ctx, sp, fr)
  drawSoil(ctx, sp, c)
  drawParticles(ctx, sp)
}

function onPointerMove(e: PointerEvent): void {
  pointer = { x: e.clientX, y: e.clientY }
  pointerDirty = true
}

function onPointerOut(): void {
  pointer = null
  pointerDirty = true
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

onMounted(() => {
  if (props.overlay.hover === false) return
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  document.addEventListener('pointerleave', onPointerOut)
})

onUnmounted(() => {
  window.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerleave', onPointerOut)
})

useElementCanvas(canvasRef, {
  init(_w, _h, nowMs) {
    last = nowMs
    clock = interval() - 4
    cycle = -1
    dust = []
    sparks = []
    lastEvent = ''
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (reduced) {
      drawScene(ctx, w, h, { open: 1, slam: false, fingers: 0, shake: 0, holding: false, seam: 0 }, interval() * 0.9)
      return
    }
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    if (canvasRef.value) readPointer(canvasRef.value)
    const fr = advance(dt)
    drawScene(ctx, w, h, fr, clock % interval())
  },
})
</script>

<template>
  <canvas ref="canvas" class="border-coffin" aria-hidden="true" />
</template>

<style scoped>
.border-coffin {
  position: absolute;
  inset: -20%;
  width: 140%;
  height: 140%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
