<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { HallwayScene } from '@/types/api/items'
import { darken, lighten, parseHex } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { drawHorrorFace } from '@/utils/cosmetics/horrorFace'
import { createRadialSprite } from '@/utils/cosmetics/sceneLayer'
import { fillCircle as circle, fillPoly as poly, type Ctx, type Point } from '@/utils/cosmetics/canvasShapes'
import { hash01, randBetween } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{ scene: HallwayScene }>()

const VOID = 'rgb(0, 0, 0)'
const STATIC_T = 3
const TICK = 1.7
const SEGMENTS = 12
const NEAR_CLIP = 0.12
const FADE_DEPTH = 11
const SHADE_STEPS = 32
const FIRST_SCARE_MIN_S = 4
const FIRST_SCARE_MAX_S = 8
const SCARE_MIN_S = 6
const SCARE_MAX_S = 14

type ScareKind = 'runner' | 'door' | 'room' | 'spider'

const KINDS: ScareKind[] = ['runner', 'door', 'room', 'spider']
const DURATION: Record<ScareKind, number> = { runner: 1.75, door: 1.25, room: 2.05, spider: 1.9 }
const RUNNER_RUN = 1.15
const RUNNER_SLAM = 1.5
const DOOR_SWING = 0.25
const DOOR_LUNGE = 0.55
const DOOR_SLAM = 0.95
const ROOM_PULL = 0.45
const ROOM_RISE = 0.95
const ROOM_SLAM = 1.35
const ROOM_OUT = 1.47

interface Feature {
  side: number
  z: number
  z1: number
  z2: number
  idx: number
}

interface Corridor {
  openings: Feature[]
  doors: Feature[]
}

interface Scare {
  kind: ScareKind
  start: number
  side: number
  z: number
  idx: number
  x: number
  seed: number
}

let startedAt = 0
let nextScareAt = 0
let scare: Scare | null = null
let lastKind: ScareKind | null = null
let camX = 0
let camY = 0
let focal = 1
let darkSprite: HTMLCanvasElement | null = null
let warmSprite: HTMLCanvasElement | null = null
const shades = new Map<string, string>()

function px(x: number, z: number): number {
  return camX + (x * focal) / z
}

function py(y: number, z: number): number {
  return camY + (y * focal) / z
}

function project(x: number, y: number, z: number): Point {
  return [px(x, z), py(y, z)]
}

function panel(ctx: Ctx, xa: number, za: number, xb: number, zb: number, y0: number, y1: number): void {
  ctx.beginPath()
  ctx.moveTo(px(xa, za), py(y0, za))
  ctx.lineTo(px(xb, zb), py(y0, zb))
  ctx.lineTo(px(xb, zb), py(y1, zb))
  ctx.lineTo(px(xa, za), py(y1, za))
  ctx.closePath()
  ctx.fill()
}

function slab(ctx: Ctx, y: number, z1: number, z2: number): void {
  ctx.beginPath()
  ctx.moveTo(px(-1, z1), py(y, z1))
  ctx.lineTo(px(1, z1), py(y, z1))
  ctx.lineTo(px(1, z2), py(y, z2))
  ctx.lineTo(px(-1, z2), py(y, z2))
  ctx.closePath()
  ctx.fill()
}

function edge(ctx: Ctx, x: number, z: number): void {
  ctx.beginPath()
  ctx.moveTo(px(x, z), py(-1, z))
  ctx.lineTo(px(x, z), py(1, z))
  ctx.stroke()
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2)
  ctx.fill()
}

function line(ctx: Ctx, pts: Point[]): void {
  ctx.beginPath()
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
  ctx.stroke()
}

function shade(hex: string, sh: number, k = 1): string {
  const q = Math.round(sh * SHADE_STEPS)
  const key = `${hex}|${q}|${k}`
  let out = shades.get(key)
  if (!out) {
    out = darken(hex, 1 - (0.15 + (0.85 * q) / SHADE_STEPS) * k)
    shades.set(key, out)
  }
  return out
}

function drawSegment(ctx: Ctx, z1: number, z2: number): number {
  const sh = Math.max(0, 1 - z1 / FADE_DEPTH)
  const sc = props.scene
  ctx.fillStyle = shade(sc.floor, sh)
  slab(ctx, 1, z1, z2)
  ctx.fillStyle = shade(sc.wall, sh, 0.5)
  slab(ctx, -1, z1, z2)
  ctx.fillStyle = shade(sc.wall, sh)
  panel(ctx, -1, z1, -1, z2, -1, 1)
  panel(ctx, 1, z1, 1, z2, -1, 1)
  return sh
}

function drawSeams(ctx: Ctx, z1: number, lw: number): void {
  ctx.strokeStyle = withAlpha(shade(props.scene.wall, 0), 0.6)
  ctx.lineWidth = lw
  edge(ctx, -1, z1)
  edge(ctx, 1, z1)
}

function drawOpening(ctx: Ctx, side: number, z1: number, sh: number, lw: number, idx: number): Feature {
  const oz1 = z1 + 0.35
  const oz2 = z1 + 1.15
  ctx.fillStyle = shade(props.scene.wall, 0, 0.1)
  panel(ctx, side, oz1, side, oz2, -0.75, 1)
  ctx.strokeStyle = withAlpha(lighten(props.scene.wall, 0.35), sh * 0.6)
  ctx.lineWidth = lw * 1.5
  ctx.beginPath()
  ctx.moveTo(px(side, oz1), py(-0.75, oz1))
  ctx.lineTo(px(side, oz2), py(-0.75, oz2))
  ctx.lineTo(px(side, oz2), py(1, oz2))
  ctx.stroke()
  return { side, z: (oz1 + oz2) / 2, z1: oz1, z2: oz2, idx }
}

function doorPanel(ctx: Ctx, side: number, z1: number, fz: number, fx: number, sh: number): void {
  ctx.fillStyle = withAlpha(lighten(props.scene.wall, 0.12), sh)
  panel(ctx, side, z1, fx, fz, -0.6, 1)
}

function drawDoor(ctx: Ctx, side: number, z1: number, sh: number, s: number, idx: number, t: number): Feature {
  const dz1 = z1 + 0.5
  const dz2 = z1 + 1
  const zm = (dz1 + dz2) / 2
  const open = scare?.kind === 'door' && scare.idx === idx ? doorSwing(scare, t) : 0
  if (open > 0) {
    ctx.fillStyle = shade(props.scene.wall, 0, 0.08)
    panel(ctx, side, dz1, side, dz2, -0.6, 1)
    const a = open * 1.9
    doorPanel(ctx, side, dz1, dz1 + Math.cos(a) * 0.5, side - side * Math.sin(a) * 0.5, sh)
    return { side, z: zm, z1: dz1, z2: dz2, idx }
  }
  doorPanel(ctx, side, dz1, dz2, side, sh)
  ctx.fillStyle = withAlpha(lighten(props.scene.wall, 0.5), sh)
  circle(ctx, px(side, zm), py(0.2, zm), 1.2 * s)
  return { side, z: zm, z1: dz1, z2: dz2, idx }
}

function drawCorridor(ctx: Ctx, t: number, s: number): Corridor {
  const out: Corridor = { openings: [], doors: [] }
  const lw = Math.max(1, s)
  const passed = Math.floor(t / TICK)
  const walk = t - passed * TICK
  for (let i = SEGMENTS; i >= 0; i--) {
    const z1 = i * TICK - walk + 0.55
    if (z1 <= NEAR_CLIP) continue
    const idx = i + passed
    const sh = drawSegment(ctx, z1, z1 + TICK)
    drawSeams(ctx, z1, lw)
    const side = hash01(idx * 7) < 0.5 ? -1 : 1
    if (idx % 2 === 0) out.openings.push(drawOpening(ctx, side, z1, sh, lw, idx))
    else if (hash01(idx * 13) < 0.7) out.doors.push(drawDoor(ctx, side, z1, sh, s, idx, t))
  }
  return out
}

function pickKind(): ScareKind {
  const pool = KINDS.filter((k) => k !== lastKind)
  return pool[Math.floor(Math.random() * pool.length)]
}

function nearest(list: Feature[], zMin: number, zMax: number): Feature | null {
  let best: Feature | null = null
  for (const f of list) {
    if (f.z <= zMin || f.z >= zMax) continue
    if (!best || f.z < best.z) best = f
  }
  return best
}

function updateScare(t: number, c: Corridor): void {
  if (scare && t - scare.start > DURATION[scare.kind]) scare = null
  if (scare || t < nextScareAt) return
  const kind = pickKind()
  const feat = kind === 'room' ? nearest(c.openings, 1.2, 2.6) : kind === 'door' ? nearest(c.doors, 1.4, 2.8) : null
  if ((kind === 'room' || kind === 'door') && !feat) return
  const side = feat?.side ?? (Math.random() < 0.5 ? -1 : 1)
  scare = {
    kind,
    start: t,
    side,
    z: feat?.z ?? 8,
    idx: feat?.idx ?? -1,
    x: randBetween(0.3, 0.7),
    seed: Math.floor(Math.random() * 1000),
  }
  lastKind = kind
  nextScareAt = t + randBetween(SCARE_MIN_S, SCARE_MAX_S)
}

function doorSwing(sc: Scare, t: number): number {
  return Math.min(1, (t - sc.start) / DOOR_SWING)
}

function limb(ctx: Ctx, a: Point, b: Point, wa: number, wb: number): void {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  poly(ctx, [
    [a[0] + (nx * wa) / 2, a[1] + (ny * wa) / 2],
    [b[0] + (nx * wb) / 2, b[1] + (ny * wb) / 2],
    [b[0] - (nx * wb) / 2, b[1] - (ny * wb) / 2],
    [a[0] - (nx * wa) / 2, a[1] - (ny * wa) / 2],
  ])
  circle(ctx, b[0], b[1], wb / 2)
}

interface Pose {
  gait: number
  tilt: number
}

function drawLegs(ctx: Ctx, fx: number, fy: number, k: number, gait: number): void {
  for (const side of [-1, 1]) {
    const lift = Math.max(0, side * Math.sin(gait))
    const hip: Point = [fx + side * 0.09 * k, fy + 0.35 * k]
    const knee: Point = [hip[0] + side * (0.05 + lift * 0.1) * k, hip[1] + (0.36 - lift * 0.17) * k]
    const foot: Point = [knee[0] + side * 0.03 * k, knee[1] + (0.42 - lift * 0.32) * k]
    limb(ctx, hip, knee, 0.21 * k, 0.16 * k)
    limb(ctx, knee, foot, 0.16 * k, 0.13 * k)
  }
}

function drawFigure(ctx: Ctx, fx: number, fy: number, k: number, pose: Pose, seed: number): void {
  ctx.save()
  ctx.translate(fx, fy + 0.35 * k)
  ctx.rotate(pose.tilt)
  ctx.translate(-fx, -(fy + 0.35 * k))
  ctx.fillStyle = props.scene.figure
  drawLegs(ctx, fx, fy, k, pose.gait)
  poly(ctx, [[fx - 0.32 * k, fy - 0.38 * k], [fx + 0.32 * k, fy - 0.38 * k], [fx + 0.22 * k, fy + 0.42 * k], [fx - 0.22 * k, fy + 0.42 * k]])
  drawHorrorFace(ctx, fx, fy - 0.5 * k, 0.5 * k, seed, props.scene)
  ctx.restore()
}

function drawRunnerBody(ctx: Ctx, fx: number, fy: number, k: number, age: number, seed: number): void {
  const pose: Pose = { gait: age * 28, tilt: Math.sin(age * 14) * 0.08 }
  ctx.globalAlpha = 0.3
  drawFigure(ctx, fx + Math.sin(age * 28) * 0.05 * k, fy + 0.04 * k, k, pose, seed)
  ctx.globalAlpha = 1
  drawFigure(ctx, fx, fy, k, pose, seed)
}

function drawReacher(ctx: Ctx, fx: number, fy: number, k: number, u: number, seed: number): void {
  const pose: Pose = { gait: 0, tilt: (u - 0.5) * 0.12 }
  ctx.globalAlpha = 0.3
  drawFigure(ctx, fx, fy - 0.05 * k, k * 1.03, pose, seed)
  ctx.globalAlpha = 1
  drawFigure(ctx, fx, fy, k, pose, seed)
}

function drawSlam(ctx: Ctx, w: number, h: number, u: number, s: number, seed: number): number {
  const grow = Math.min(1, u / 0.12)
  const H = Math.min(w, h) * (1.1 + 0.3 * grow)
  const jx = Math.sin(u * 17) * 3 * s
  const jy = Math.cos(u * 13) * 2 * s
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
  ctx.fillRect(0, 0, w, h)
  drawHorrorFace(ctx, w * 0.5 + jx, h * 0.42 + jy, H * 1.15, seed, props.scene)
  return Math.sin(u * 16) * 8 * s
}

function drawRunner(ctx: Ctx, w: number, h: number, f: number, age: number, s: number, sc: Scare): number {
  if (age < RUNNER_RUN) {
    const u = age / RUNNER_RUN
    const z = sc.z - (sc.z - 1) * u * u
    const [fx, fy] = project(Math.sin(age * 3) * 0.1, 0.02 * Math.abs(Math.sin(age * 15)), z)
    drawRunnerBody(ctx, fx, fy, f / z, age, sc.seed)
    return u > 0.7 ? Math.sin(age * 90) * 5 * s * (u - 0.7) / 0.3 : 0
  }
  if (age < RUNNER_SLAM) return drawSlam(ctx, w, h, age - RUNNER_RUN, s, sc.seed)
  return Math.sin(age * 70) * 4 * s
}

function drawDoorScare(ctx: Ctx, w: number, h: number, f: number, age: number, s: number, sc: Scare): number {
  if (age < DOOR_SWING) return Math.sin(age * 120) * 3 * s
  if (age < DOOR_LUNGE) {
    const u = (age - DOOR_SWING) / (DOOR_LUNGE - DOOR_SWING)
    const z = sc.z - (sc.z - 0.95) * u
    const [fx, fy] = project(sc.side * 0.85 * (1 - u), 0.05, z)
    drawReacher(ctx, fx, fy, f / z, u, sc.seed)
    return Math.sin(age * 90) * 6 * s * u
  }
  if (age < DOOR_SLAM) return drawSlam(ctx, w, h, age - DOOR_LUNGE, s, sc.seed)
  return Math.sin(age * 70) * 4 * s
}

function drawRoom(ctx: Ctx, w: number, h: number, s: number): void {
  const { wall, floor, face } = props.scene
  ctx.fillStyle = VOID
  ctx.fillRect(0, 0, w, h)
  const fl = ctx.createLinearGradient(0, h * 0.55, 0, h)
  fl.addColorStop(0, withAlpha(floor, 0))
  fl.addColorStop(1, withAlpha(floor, 0.9))
  ctx.fillStyle = fl
  ctx.fillRect(0, h * 0.55, w, h * 0.45)
  ctx.fillStyle = withAlpha(wall, 0.35)
  ctx.fillRect(w * 0.15, h * 0.12, w * 0.7, h * 0.48)
  ctx.fillStyle = withAlpha(face, 0.06)
  ctx.fillRect(w * 0.62, h * 0.18, w * 0.14, h * 0.22)
  ctx.fillStyle = shade(wall, 0, 0.6)
  ctx.fillRect(w * 0.08, h * 0.5, w * 0.16, h * 0.3)
  ctx.fillRect(w * 0.7, h * 0.56, w * 0.22, h * 0.26)
  ctx.fillRect(w * 0.3, h * 0.62, w * 0.12, h * 0.14)
  ctx.fillStyle = shade(wall, 0, 0.3)
  ctx.fillRect(0, 0, w, 2 * s)
}

function drawRoomFigure(ctx: Ctx, w: number, h: number, f: number, age: number, s: number, sc: Scare): number {
  if (age < ROOM_RISE) {
    const u = (age - ROOM_PULL) / (ROOM_RISE - ROOM_PULL)
    const z = 5 - 4 * u * u
    const [fx, fy] = project(0, 0.15, z)
    drawReacher(ctx, fx, fy, f / z, u, sc.seed)
    return Math.sin(age * 80) * 4 * s * u
  }
  if (age < ROOM_SLAM) return drawSlam(ctx, w, h, age - ROOM_RISE, s, sc.seed)
  return 0
}

function drawSpiderLegs(ctx: Ctx, x: number, y: number, k: number, wiggle: number): void {
  ctx.strokeStyle = props.scene.figure
  ctx.lineWidth = Math.max(1, 0.06 * k)
  for (let i = 0; i < 4; i++) {
    const a = 0.35 + i * 0.4 + wiggle * (i % 2 ? 1 : -1)
    const ex = Math.cos(a) * 0.55 * k
    const ey = Math.sin(a) * 0.35 * k - 0.1 * k
    line(ctx, [[x, y], [x - ex * 0.5, y + ey - 0.2 * k], [x - ex, y + ey + 0.15 * k]])
    line(ctx, [[x, y], [x + ex * 0.5, y + ey - 0.2 * k], [x + ex, y + ey + 0.15 * k]])
  }
}

function drawSpider(ctx: Ctx, w: number, h: number, age: number, s: number, sc: Scare): number {
  const drop = 0.5
  const hang = 1.3
  const k = Math.min(w, h) * 0.34
  let reach = 1
  if (age < drop) reach = 1 - Math.pow(1 - age / drop, 3)
  else if (age > hang) reach = Math.max(0, 1 - (age - hang) / (DURATION.spider - hang))
  const swing = Math.sin(age * 5) * 0.06 * k * reach
  const x = sc.x * w + swing
  const y = -0.3 * k + reach * h * 0.42
  ctx.strokeStyle = withAlpha(props.scene.face, 0.5)
  ctx.lineWidth = Math.max(1, s * 0.6)
  line(ctx, [[sc.x * w, 0], [x, y - 0.2 * k]])
  drawSpiderLegs(ctx, x, y, k, Math.sin(age * 22) * 0.18)
  ctx.fillStyle = props.scene.figure
  ellipse(ctx, x, y - 0.1 * k, 0.16 * k, 0.13 * k)
  ellipse(ctx, x, y + 0.14 * k, 0.24 * k, 0.28 * k)
  ctx.fillStyle = props.scene.face
  circle(ctx, x - 0.05 * k, y - 0.13 * k, 0.025 * k)
  circle(ctx, x + 0.05 * k, y - 0.13 * k, 0.025 * k)
  return age > drop - 0.08 && age < drop + 0.12 ? Math.sin(age * 90) * 4 * s : 0
}

function roomPhase(t: number): 'pull' | 'inside' | 'kick' | null {
  if (!scare || scare.kind !== 'room') return null
  const age = t - scare.start
  if (age < ROOM_PULL) return 'pull'
  if (age < ROOM_OUT) return 'inside'
  return 'kick'
}

function viewShift(t: number, w: number): number {
  const phase = roomPhase(t)
  if (!scare || !phase) return 0
  const age = t - scare.start
  if (phase === 'pull') {
    const u = age / ROOM_PULL
    return -scare.side * w * 0.5 * u * u
  }
  if (phase === 'kick') {
    const u = (age - ROOM_OUT) / (DURATION.room - ROOM_OUT)
    return -scare.side * w * 0.5 * Math.pow(1 - u, 3)
  }
  return 0
}

function drawPullMouth(ctx: Ctx, w: number, h: number, t: number): void {
  if (!scare || roomPhase(t) !== 'pull') return
  const u = (t - scare.start) / ROOM_PULL
  const cover = w * u * u
  ctx.fillStyle = VOID
  if (scare.side < 0) ctx.fillRect(0, 0, cover, h)
  else ctx.fillRect(w - cover, 0, cover, h)
}

function drawScare(ctx: Ctx, w: number, h: number, f: number, t: number, s: number): number {
  if (!scare) return 0
  const age = t - scare.start
  if (scare.kind === 'runner') return drawRunner(ctx, w, h, f, age, s, scare)
  if (scare.kind === 'door') return drawDoorScare(ctx, w, h, f, age, s, scare)
  if (scare.kind === 'room') return roomPhase(t) === 'inside' ? drawRoomFigure(ctx, w, h, f, age, s, scare) : kickJolt(age, s)
  return drawSpider(ctx, w, h, age, s, scare)
}

function kickJolt(age: number, s: number): number {
  if (age < ROOM_OUT) return 0
  const u = (age - ROOM_OUT) / (DURATION.room - ROOM_OUT)
  return Math.sin(age * 55) * 16 * s * Math.pow(1 - u, 2)
}

function slamWindow(): [number, number] | null {
  if (!scare) return null
  if (scare.kind === 'runner') return [RUNNER_RUN, RUNNER_SLAM]
  if (scare.kind === 'door') return [DOOR_LUNGE, DOOR_SLAM]
  if (scare.kind === 'room') return [ROOM_RISE, ROOM_SLAM]
  return null
}

function beamStrength(t: number, reduced: boolean): number {
  const dip = !reduced && Math.sin(t * 7.7) > 0.992 ? 0.45 : 1
  let panic = 1
  if (scare && scare.kind !== 'spider') {
    const age = t - scare.start
    const win = slamWindow()
    if (win) panic = 1 - 0.2 * Math.min(1, Math.max(0, (age - win[0] + 0.4) / 0.4))
  }
  return (0.94 + Math.sin(t * 53) * 0.03 + Math.sin(t * 31) * 0.02) * dip * panic
}

function buildBeamSprites(): void {
  darkSprite = createRadialSprite(256, [0, 0, 0], [[0, 0], [0.3, 0.12], [0.62, 0.72], [1, 1]])
  const warm = parseHex(props.scene.beam)
  warmSprite = warm ? createRadialSprite(128, warm, [[0, 0.14], [1, 0]]) : null
}

function drawBeam(ctx: Ctx, w: number, h: number, lx: number, ly: number, flick: number): void {
  const R = Math.max(w, h) * 0.58 * flick
  const x0 = lx - R
  const y0 = ly - R
  const x1 = lx + R
  const y1 = ly + R
  if (darkSprite) ctx.drawImage(darkSprite, x0, y0, R * 2, R * 2)
  ctx.fillStyle = VOID
  if (y0 > 0) ctx.fillRect(0, 0, w, y0)
  if (y1 < h) ctx.fillRect(0, y1, w, h - y1)
  if (x0 > 0) ctx.fillRect(0, y0, x0, R * 2)
  if (x1 < w) ctx.fillRect(x1, y0, w - x1, R * 2)
  if (warmSprite) ctx.drawImage(warmSprite, lx - R * 0.5, ly - R * 0.5, R, R)
}

function drawBlackout(ctx: Ctx, w: number, h: number, t: number): void {
  if (!scare) return
  const age = t - scare.start
  const win = slamWindow()
  if (!win) return
  if (age >= win[1] && age < win[1] + 0.12) {
    ctx.fillStyle = VOID
    ctx.fillRect(0, 0, w, h)
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, nowMs) {
    startedAt = nowMs
    nextScareAt = randBetween(FIRST_SCARE_MIN_S, FIRST_SCARE_MAX_S)
    scare = null
    lastKind = null
    buildBeamSprites()
  },
  resize() {},
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : (now - startedAt) / 1000
    const s = Math.min(w, h) / 110
    const f = Math.min(w * 0.38, h * 1.4)
    const phase = roomPhase(t)
    const bobAmp = phase === 'kick' ? 5 : 2.2
    const bob = Math.sin(t * 4.4) * bobAmp * s
    const sway = Math.sin(t * 2.2) * 3 * s
    const cx = w / 2 + viewShift(t, w)
    const cy = h / 2 + bob
    camX = cx + sway * 0.4
    camY = cy
    focal = f

    if (phase === 'inside') {
      drawRoom(ctx, w, h, s)
    } else {
      ctx.fillStyle = VOID
      ctx.fillRect(0, 0, w, h)
      const corridor = drawCorridor(ctx, t, s)
      if (!reduced) updateScare(t, corridor)
      drawPullMouth(ctx, w, h, t)
    }
    const jolt = reduced ? 0 : drawScare(ctx, w, h, f, t, s)
    const beamX = phase === 'inside' ? w / 2 : cx + sway
    drawBeam(ctx, w, h, beamX + jolt, cy - 4 * s, beamStrength(t, reduced))
    if (!reduced) drawBlackout(ctx, w, h, t)
  },
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>
