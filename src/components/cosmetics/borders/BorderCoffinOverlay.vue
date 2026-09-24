<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import { useStackPointer } from '@/composables/useStackPointer'
import type { BorderCoffinOverlaySpec, BorderOverlayHost } from '@/types/api/items'
import { darken, lighten } from '@/utils/color'
import type { Ctx, Point } from '@/utils/cosmetics/canvasShapes'
import { frameDelta, overlaySpace, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { hash01, randBetween as rand } from '@/utils/random'
import { computed, useTemplateRef } from 'vue'

const props = defineProps<BorderOverlayHost & { overlay: BorderCoffinOverlaySpec }>()

const MARGIN = 20
const LID_OUTSET = 1.5
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
const FINGER_LENGTHS = [6.6, 8, 7.6, 6.2]

type Phase = 'shut' | 'hold' | 'rise' | 'creak' | 'peek' | 'slam' | 'wait' | 'open' | 'idle'

interface Mark {
  x: number
  y: number
  at: number
}

interface Knock extends Mark {
  hit: boolean
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
  phase: Phase
  open: number
  fingers: number
  shake: number
  seam: number
}

const REST: Frame = { phase: 'idle', open: 1, fingers: 0, shake: 0, seam: 0 }

let clock = 0
let last = 0
let cycle = -1
let knocks: Knock[] = []
let marks: Mark[] = []
let dust: Particle[] = []
let sparks: Particle[] = []
let lastPhase: Phase = 'idle'
let knockK = 0
let knockMark: Knock | null = null
let mound: Path2D | null = null

function polygonOf(mask: string): Point[] {
  const nums = /^[\sMLZ\d.,-]+$/i.test(mask) ? (mask.match(/-?\d*\.?\d+/g) ?? []).map(Number) : []
  const pts: Point[] = []
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]])
  return pts.length >= 3 ? pts : [[0, 0], [100, 0], [100, 100], [0, 100]]
}

function edgeNormal(a: Point, b: Point): Point {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  return [(b[1] - a[1]) / len, -(b[0] - a[0]) / len]
}

function outset(pts: Point[], d: number): Point[] {
  return pts.map((p, i) => {
    const n1 = edgeNormal(pts[(i + pts.length - 1) % pts.length], p)
    const n2 = edgeNormal(p, pts[(i + 1) % pts.length])
    const k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1])
    return [p[0] + (n1[0] + n2[0]) * k, p[1] + (n1[1] + n2[1]) * k]
  })
}

function pathOf(pts: Point[], closed: boolean): Path2D {
  const p = new Path2D()
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)))
  if (closed) p.closePath()
  return p
}

const geometry = computed(() => {
  const opening = polygonOf(props.avatarMask ?? '')
  const lid = outset(opening, LID_OUTSET)
  const xs = lid.map((p) => p[0])
  const seam = lid.filter((p) => p[0] > 50).reverse()
  return {
    opening: pathOf(opening, true),
    lid: pathOf(lid, true),
    seam: pathOf(seam, false),
    seamPts: seam,
    hinge: Math.min(...xs),
    edge: Math.max(...xs),
  }
})

const tones = computed(() => {
  const o = props.overlay
  return {
    plankLine: withAlpha(darken(o.lid, 0.45), 0.7),
    plankGrain: withAlpha(lighten(o.lid, 0.25), 0.35),
    rivet: lighten(o.lid, 0.3),
    reliefDark: withAlpha(darken(o.lid, 0.35), 0.8),
    reliefLit: withAlpha(lighten(o.lid, 0.3), 0.5),
    sheen: withAlpha(lighten(o.lid, 0.5), 0.5),
    bulgeLit: lighten(o.lid, 0.4),
    bulgeDark: darken(o.lid, 0.4),
    ironDent: withAlpha(darken(o.lid, 0.5), 0.7),
    stoneCrack: withAlpha(darken(o.lid, 0.6), 0.85),
    oakScratch: withAlpha(lighten(o.lid, 0.45), 0.7),
    glassLid: withAlpha(o.lid, 0.4),
    root: withAlpha(o.root, 0.9),
    dust: lighten(o.soil, 0.35),
  }
})

const holdS = computed(() => (props.overlay.holdMs ?? 5000) / 1000)
const intervalS = computed(() => Math.max((props.overlay.intervalMs ?? 14000) / 1000, holdS.value + 6))

function pulse(u: number): number {
  return u < 0 || u > 1 ? 0 : Math.sin(u * Math.PI)
}

function easeOut(u: number): number {
  return 1 - Math.pow(1 - u, 3)
}

function seedCycle(n: number): void {
  cycle = n
  marks = []
  const h = holdS.value
  knocks = [0.22, 0.5, 0.78].map((f, i) => ({
    x: 30 + hash01(n * 31 + i * 7) * 40,
    y: 22 + hash01(n * 53 + i * 11) * 55,
    at: SHUT_S + h * f + (hash01(n * 17 + i) - 0.5) * h * 0.12,
    hit: false,
  }))
}

function frameAt(c: number): Frame {
  const tRise = SHUT_S + holdS.value
  const tCreak = tRise + RISE_S
  const tPeek = tCreak + CREAK_S
  const tSlam = tPeek + PEEK_S
  const tWait = tSlam + SLAM_S
  const tOpen = tWait + WAIT_S
  const tIdle = tOpen + OPEN_S
  if (c < SHUT_S) return { phase: 'shut', open: 1 - Math.pow(c / SHUT_S, 2.4), fingers: 0, shake: 0, seam: 0 }
  if (c < tRise) return { phase: 'hold', open: 0, fingers: 0, shake: pulse((c - SHUT_S) / 0.25), seam: 1 }
  if (c < tCreak) return { phase: 'rise', open: 0, fingers: easeOut((c - tRise) / RISE_S), shake: 0, seam: 1 }
  if (c < tPeek) {
    const u = (c - tCreak) / CREAK_S
    return { phase: 'creak', open: CREAK_OPEN * easeOut(u) + Math.sin(u * 40) * 0.006 * (1 - u), fingers: 1, shake: 0, seam: 1 - u }
  }
  if (c < tSlam) return { phase: 'peek', open: CREAK_OPEN + Math.sin(c * 30) * 0.004, fingers: 1, shake: 0, seam: 0 }
  if (c < tWait) return { phase: 'slam', open: CREAK_OPEN * (1 - (c - tSlam) / SLAM_S), fingers: 1 - (c - tSlam) / SLAM_S, shake: 0, seam: 0 }
  if (c < tOpen) return { phase: 'wait', open: 0, fingers: 0, shake: pulse((c - tWait) / 0.3), seam: 0.3 }
  if (c < tIdle) return { phase: 'open', open: easeOut((c - tOpen) / OPEN_S), fingers: 0, shake: 0, seam: 0 }
  return REST
}

function readKnock(c: number): void {
  knockK = 0
  knockMark = null
  for (const kn of knocks) {
    const u = (c - kn.at) / KNOCK_S
    if (u >= 0 && u <= 1) {
      knockK = pulse(u)
      knockMark = kn
      return
    }
  }
}

function spawnDust(x0: number, x1: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) {
    dust.push({ x: rand(x0, x1), y, vx: rand(-8, 8), vy: rand(2, 10), born: clock, life: rand(0.5, 0.9) })
  }
}

function seamXAt(y: number): number {
  const pts = geometry.value.seamPts
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    if (ay !== by && (y - ay) * (y - by) <= 0) return ax + ((y - ay) / (by - ay)) * (bx - ax)
  }
  return geometry.value.edge
}

function spawnSparks(y: number): void {
  const x = seamXAt(y)
  for (let i = 0; i < 7; i++) {
    const a = rand(-1.2, 1.2)
    sparks.push({ x, y, vx: Math.cos(a) * rand(20, 50), vy: Math.sin(a) * rand(20, 50) - 20, born: clock, life: rand(0.25, 0.45) })
  }
}

function firePhase(fr: Frame): void {
  if (fr.phase === lastPhase) return
  lastPhase = fr.phase
  if (fr.phase === 'hold') spawnDust(20, 80, 2, 10)
  if (fr.phase === 'slam') spawnDust(14, 86, 3, 14)
}

function stepKnocks(): void {
  const mark = knockMark
  if (!mark || mark.hit || knockK < 0.9) return
  mark.hit = true
  marks.push({ x: mark.x, y: mark.y, at: clock })
  spawnDust(mark.x - 12, mark.x + 12, 2, 4)
  if (props.overlay.material === 'iron') spawnSparks(mark.y)
}

function stepParticles(list: Particle[], gravity: number, dt: number): void {
  let kept = 0
  for (const p of list) {
    if (clock - p.born >= p.life) continue
    p.vy += gravity * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    list[kept++] = p
  }
  list.length = kept
}

function isHeld(fr: Frame): boolean {
  if (props.overlay.hover === false || fr.phase !== 'hold') return false
  const p = pointer.read()
  return !!p && p.nx < 0.5 && p.ny < 0.5
}

function advance(dt: number): Frame {
  const held = isHeld(frameAt(clock % intervalS.value))
  if (!held) clock += dt
  const c = clock % intervalS.value
  const n = Math.floor(clock / intervalS.value)
  if (n !== cycle) seedCycle(n)
  const fr = frameAt(c)
  readKnock(c)
  firePhase(fr)
  if (!held) stepKnocks()
  stepParticles(dust, 40, dt)
  stepParticles(sparks, 120, dt)
  return held ? { ...fr, seam: 0, shake: 0 } : fr
}

function lidEdge(open: number): number {
  const { hinge, edge } = geometry.value
  return hinge + (edge - hinge) * (1 - open)
}

function lidTransform(ctx: Ctx, open: number): void {
  if (props.overlay.material === 'stone') {
    ctx.translate(0, open * 100)
    return
  }
  const hx = geometry.value.hinge
  ctx.translate(hx, 0)
  ctx.scale(Math.max(0.03, 1 - open), 1)
  ctx.translate(-hx, 0)
}

function drawLidShadow(ctx: Ctx, open: number): void {
  if (open <= 0.01 || open >= 0.98 || props.overlay.material === 'stone') return
  const edge = lidEdge(open)
  ctx.save()
  ctx.clip(geometry.value.opening)
  const g = ctx.createLinearGradient(edge, 0, edge + 10, 0)
  g.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
  g.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = g
  ctx.fillRect(edge, 0, 10, 100)
  ctx.restore()
}

function drawPlanks(ctx: Ctx, px: number): void {
  const t = tones.value
  ctx.strokeStyle = t.plankLine
  ctx.lineWidth = Math.max(0.6 * px, 0.7)
  for (let i = 1; i < 5; i++) {
    const x = 12 + i * 15.2
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + (i - 2.5) * 1.8, 100)
    ctx.stroke()
  }
  ctx.strokeStyle = t.plankGrain
  for (let i = 0; i < 5; i++) {
    const x = 16 + i * 15.2
    ctx.beginPath()
    ctx.moveTo(x, 6)
    ctx.quadraticCurveTo(x + 2, 50, x - 1, 94)
    ctx.stroke()
  }
}

function drawRivets(ctx: Ctx, px: number): void {
  ctx.fillStyle = tones.value.rivet
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.beginPath()
      ctx.arc(28 + c * 22 + (r % 2) * 11, 12 + r * 19, 1.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const rust = props.overlay.rust
  if (!rust) return
  ctx.strokeStyle = withAlpha(rust, 0.6)
  ctx.lineWidth = Math.max(0.6 * px, 1)
  for (const [x, y] of [[39, 31], [72, 50]]) {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 0.6, y + 14)
    ctx.stroke()
  }
}

function drawRelief(ctx: Ctx): void {
  ctx.fillStyle = tones.value.reliefDark
  ctx.fillRect(47, 18, 6, 60)
  ctx.fillRect(35, 34, 30, 6)
  ctx.fillStyle = tones.value.reliefLit
  ctx.fillRect(47, 18, 1.5, 60)
  ctx.fillRect(35, 34, 30, 1.5)
}

function drawGlassSheen(ctx: Ctx, px: number): void {
  ctx.strokeStyle = tones.value.sheen
  ctx.lineWidth = Math.max(0.6 * px, 2)
  for (const off of [0, 9]) {
    ctx.beginPath()
    ctx.moveTo(20 + off, 90)
    ctx.lineTo(62 + off, 6)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
  for (let i = 0; i < 14; i++) {
    ctx.beginPath()
    ctx.arc(18 + hash01(i * 3) * 64, 10 + hash01(i * 5) * 80, 0.5 + hash01(i * 7), 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawMaterial(ctx: Ctx, px: number): void {
  const m = props.overlay.material
  if (m === 'oak') drawPlanks(ctx, px)
  else if (m === 'iron') drawRivets(ctx, px)
  else if (m === 'stone') drawRelief(ctx)
  else drawGlassSheen(ctx, px)
}

function drawBulge(ctx: Ctx, m: Mark, k: number): void {
  const r = 6 + k * 6
  const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r)
  g.addColorStop(0, withAlpha(tones.value.bulgeLit, 0.6 * k))
  g.addColorStop(0.7, withAlpha(tones.value.bulgeDark, 0.4 * k))
  g.addColorStop(1, withAlpha(props.overlay.lid, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(m.x, m.y, r, 0, Math.PI * 2)
  ctx.fill()
}

function drawHandprint(ctx: Ctx, x: number, y: number, alpha: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1.4, 1.4)
  ctx.rotate(-0.2)
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
  ctx.beginPath()
  ctx.moveTo(4.4, -0.5)
  ctx.quadraticCurveTo(4.8, 4, 3.2, 7.2)
  ctx.quadraticCurveTo(0, 9, -3.2, 7.2)
  ctx.quadraticCurveTo(-4.8, 4, -4.4, -0.5)
  ctx.closePath()
  FINGER_LENGTHS.forEach((len, i) => ctx.roundRect(-3.9 + i * 2.5 - 1.05, 1 - len, 2.1, len + 1, 1.05))
  ctx.save()
  ctx.translate(3.6, 3.2)
  ctx.rotate(1.05)
  ctx.roundRect(-1.05, -6.4, 2.1, 7.4, 1.05)
  ctx.restore()
  ctx.fill()
  ctx.restore()
}

function drawMark(ctx: Ctx, m: Mark, px: number): void {
  const mat = props.overlay.material
  const age = Math.min(1, (clock - m.at) / 0.6)
  if (mat === 'iron') {
    ctx.fillStyle = tones.value.ironDent
    ctx.beginPath()
    ctx.ellipse(m.x, m.y, 5, 3.5, 0.4, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  if (mat === 'stone') {
    ctx.strokeStyle = tones.value.stoneCrack
    ctx.lineWidth = Math.max(0.6 * px, 0.8)
    ctx.beginPath()
    ctx.moveTo(m.x, m.y)
    for (let i = 1; i <= 4; i++) ctx.lineTo(m.x + i * 3 * (i % 2 ? 1 : 0.4) * age, m.y - i * 4 * age + (i % 2) * 2)
    ctx.stroke()
    return
  }
  if (mat === 'glass') {
    drawHandprint(ctx, m.x, m.y, 0.3 * (1 - age * 0.5))
    return
  }
  ctx.strokeStyle = tones.value.oakScratch
  ctx.lineWidth = Math.max(0.5 * px, 0.5)
  for (let i = 0; i < 2; i++) {
    ctx.beginPath()
    ctx.moveTo(m.x - 1.5 + i * 3, m.y - 5)
    ctx.lineTo(m.x - 0.5 + i * 3, m.y + 6)
    ctx.stroke()
  }
}

function drawLid(ctx: Ctx, fr: Frame, px: number): void {
  if (fr.open >= 0.98) return
  const o = props.overlay
  const { lid } = geometry.value
  const rattle = fr.phase === 'hold' ? knockK * 0.8 : 0
  const glass = o.material === 'glass'
  ctx.save()
  ctx.beginPath()
  ctx.rect(-20, -20, 140, SOIL_BASE + 18)
  ctx.clip()
  ctx.translate(Math.sin(clock * 90) * rattle + Math.sin(clock * 70) * fr.shake * 1.5, Math.cos(clock * 80) * fr.shake)
  lidTransform(ctx, fr.open)
  ctx.clip(lid)
  ctx.fillStyle = glass ? tones.value.glassLid : o.lid
  ctx.fillRect(0, -2, 100, 104)
  drawMaterial(ctx, px)
  for (const m of marks) drawMark(ctx, m, px)
  if (knockMark && knockK > 0 && !glass) drawBulge(ctx, knockMark, knockK)
  ctx.strokeStyle = o.trim
  ctx.lineWidth = Math.max(0.8 * px, 1.6)
  ctx.stroke(lid)
  ctx.restore()
}

function drawSeam(ctx: Ctx, fr: Frame, px: number): void {
  if (fr.seam <= 0 || fr.open > 0.02) return
  const flicker = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(clock * 23) * Math.sin(clock * 9.3)) * (0.6 + knockK)
  ctx.strokeStyle = withAlpha(props.overlay.seam, 0.85 * fr.seam * flicker)
  ctx.lineWidth = Math.max(0.6 * px, 0.9)
  ctx.stroke(geometry.value.seam)
}

function drawFinger(ctx: Ctx, x: number, y: number, angle: number, len: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = props.overlay.bone
  ctx.beginPath()
  ctx.roundRect(0, -2.1, len * 0.62, 4.2, 2)
  ctx.fill()
  ctx.translate(len * 0.55, 0)
  ctx.rotate(0.55)
  ctx.beginPath()
  ctx.roundRect(0, -1.9, len * 0.45, 3.8, 1.9)
  ctx.fill()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.fillRect(0, -1.5, 0.8, 3)
  ctx.restore()
}

function drawFingers(ctx: Ctx, fr: Frame): void {
  if (fr.fingers <= 0) return
  const len = 3 + fr.fingers * 7
  const reach = (i: number) => len * (1 - Math.abs(i - 1.5) * 0.12)
  if (props.overlay.material === 'stone') {
    const top = 0.5 + fr.open * 100
    for (let i = 0; i < 4; i++) drawFinger(ctx, 38 + i * 8, top - 1, Math.PI / 2, reach(i))
    return
  }
  const edge = lidEdge(fr.open)
  for (let i = 0; i < 4; i++) drawFinger(ctx, edge + 1, 38 + i * 9, Math.PI, reach(i))
}

function buildMound(): Path2D {
  const p = new Path2D()
  p.moveTo(-10, SOIL_BASE)
  for (let i = 0; i <= 24; i++) {
    const u = i / 24
    const dome = Math.pow(Math.sin(u * Math.PI), 0.3)
    p.lineTo(-10 + u * 120, SOIL_BASE - (SOIL_BASE - SOIL_TOP) * dome + Math.sin(i * 1.9) * 1.2 + Math.sin(i * 0.7))
  }
  p.lineTo(110, SOIL_BASE)
  p.closePath()
  return p
}

function drawSoil(ctx: Ctx, c: number, px: number): void {
  mound ??= buildMound()
  const creep = Math.min(1, c / intervalS.value)
  ctx.fillStyle = props.overlay.soil
  ctx.fill(mound)
  ctx.strokeStyle = tones.value.root
  ctx.lineCap = 'round'
  for (let i = 0; i < 4; i++) {
    const x = 18 + i * 21
    const len = (6 + hash01(i * 13) * 12) * creep
    ctx.lineWidth = Math.max(0.6 * px, 1.6 - i * 0.1)
    ctx.beginPath()
    ctx.moveTo(x, SOIL_TOP + 2)
    ctx.quadraticCurveTo(x + (i % 2 ? 6 : -6), SOIL_TOP - len * 0.5, x + (i % 2 ? -3 : 4), SOIL_TOP - len)
    ctx.stroke()
  }
}

function drawParticles(ctx: Ctx, px: number): void {
  ctx.fillStyle = tones.value.dust
  for (const d of dust) {
    const u = (clock - d.born) / d.life
    ctx.globalAlpha = 0.7 * (1 - u)
    ctx.beginPath()
    ctx.arc(d.x, d.y, 0.6 + u * 0.8, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = props.overlay.seam
  ctx.lineWidth = Math.max(0.5 * px, 0.7)
  for (const s of sparks) {
    ctx.globalAlpha = 1 - (clock - s.born) / s.life
    ctx.beginPath()
    ctx.moveTo(s.x, s.y)
    ctx.lineTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function drawScene(ctx: Ctx, w: number, h: number, fr: Frame, c: number): void {
  const sp = overlaySpace(w, h, MARGIN)
  const px = 1 / sp.s
  ctx.save()
  ctx.translate(sp.toX(0), sp.toY(0))
  ctx.scale(sp.sx, sp.sy)
  drawLidShadow(ctx, fr.open)
  drawLid(ctx, fr, px)
  drawSeam(ctx, fr, px)
  drawFingers(ctx, fr)
  drawSoil(ctx, c, px)
  drawParticles(ctx, px)
  ctx.restore()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const pointer = useStackPointer(canvasRef, MARGIN, () => props.overlay.hover !== false)

useElementCanvas(canvasRef, {
  init(_w, _h, nowMs) {
    last = nowMs
    clock = intervalS.value - 4
    cycle = -1
    dust = []
    sparks = []
    lastPhase = 'idle'
  },
  resize() {},
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (reduced) {
      knockK = 0
      knockMark = null
      drawScene(ctx, w, h, REST, intervalS.value * 0.9)
      return
    }
    const dt = frameDelta(now, last, reduced)
    last = now
    const fr = advance(dt)
    drawScene(ctx, w, h, fr, clock % intervalS.value)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
