<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { HallwayScene } from '@/types/api/items'
import { lerpHex, lighten } from '@/utils/color'
import { withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { drawHorrorFace } from '@/utils/cosmetics/horrorFace'
import { hash01, randBetween } from '@/utils/random'
import { useTemplateRef } from 'vue'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

const props = defineProps<{ scene: HallwayScene }>()

const BLACK = '#000000'
const WHITE = '#ffffff'
const TICK = 1.7
const SPEED = 1
const SEGMENTS = 12
const NEAR_CLIP = 0.12
const FADE_DEPTH = 11
const FIRST_SCARE_MIN_S = 4
const FIRST_SCARE_MAX_S = 8
const DEFAULT_SCARE_MIN_S = 6
const DEFAULT_SCARE_MAX_S = 14

type Pt = [number, number]
type Project = (x: number, y: number, z: number) => Pt
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
let tNow = 0
let nextScareAt = 0
let scare: Scare | null = null
let lastKind: ScareKind | null = null

function poly(ctx: Ctx, pts: Pt[]): void {
  ctx.beginPath()
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
  ctx.closePath()
  ctx.fill()
}

function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2)
  ctx.fill()
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2)
  ctx.fill()
}

function line(ctx: Ctx, pts: Pt[]): void {
  ctx.beginPath()
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])))
  ctx.stroke()
}

function shade(hex: string, sh: number, k = 1): string {
  return lerpHex(BLACK, hex, (0.15 + 0.85 * sh) * k)
}

function drawSegment(ctx: Ctx, P: Project, z1: number, z2: number): number {
  const sh = Math.max(0, 1 - z1 / FADE_DEPTH)
  const sc = props.scene
  ctx.fillStyle = shade(sc.floor, sh)
  poly(ctx, [P(-1, 1, z1), P(1, 1, z1), P(1, 1, z2), P(-1, 1, z2)])
  ctx.fillStyle = shade(sc.wall, sh, 0.5)
  poly(ctx, [P(-1, -1, z1), P(1, -1, z1), P(1, -1, z2), P(-1, -1, z2)])
  ctx.fillStyle = shade(sc.wall, sh)
  poly(ctx, [P(-1, -1, z1), P(-1, 1, z1), P(-1, 1, z2), P(-1, -1, z2)])
  poly(ctx, [P(1, -1, z1), P(1, 1, z1), P(1, 1, z2), P(1, -1, z2)])
  return sh
}

function drawSeams(ctx: Ctx, P: Project, z1: number, lw: number): void {
  ctx.strokeStyle = withAlpha(shade(props.scene.wall, 0), 0.6)
  ctx.lineWidth = lw
  line(ctx, [P(-1, -1, z1), P(-1, 1, z1)])
  line(ctx, [P(1, -1, z1), P(1, 1, z1)])
}

function drawOpening(ctx: Ctx, P: Project, side: number, z1: number, sh: number, lw: number, idx: number): Feature {
  const oz1 = z1 + 0.35
  const oz2 = z1 + 1.15
  ctx.fillStyle = shade(props.scene.wall, 0, 0.1)
  poly(ctx, [P(side, -0.75, oz1), P(side, 1, oz1), P(side, 1, oz2), P(side, -0.75, oz2)])
  ctx.strokeStyle = withAlpha(lighten(props.scene.wall, 0.35), sh * 0.6)
  ctx.lineWidth = lw * 1.5
  line(ctx, [P(side, -0.75, oz1), P(side, -0.75, oz2), P(side, 1, oz2)])
  return { side, z: (oz1 + oz2) / 2, z1: oz1, z2: oz2, idx }
}

function doorPanel(ctx: Ctx, P: Project, side: number, z1: number, fz: number, fx: number, sh: number): void {
  ctx.fillStyle = withAlpha(lighten(props.scene.wall, 0.12), sh)
  poly(ctx, [P(side, -0.6, z1), P(fx, -0.6, fz), P(fx, 1, fz), P(side, 1, z1)])
}

function drawDoor(ctx: Ctx, P: Project, side: number, z1: number, sh: number, s: number, idx: number): Feature {
  const dz1 = z1 + 0.5
  const dz2 = z1 + 1
  const open = scare?.kind === 'door' && scare.idx === idx ? doorSwing(scare) : 0
  if (open > 0) {
    ctx.fillStyle = shade(props.scene.wall, 0, 0.08)
    poly(ctx, [P(side, -0.6, dz1), P(side, 1, dz1), P(side, 1, dz2), P(side, -0.6, dz2)])
    const a = open * 1.9
    doorPanel(ctx, P, side, dz1, dz1 + Math.cos(a) * 0.5, side - side * Math.sin(a) * 0.5, sh)
    return { side, z: (dz1 + dz2) / 2, z1: dz1, z2: dz2, idx }
  }
  doorPanel(ctx, P, side, dz1, dz2, side, sh)
  ctx.fillStyle = withAlpha(lighten(props.scene.wall, 0.5), sh)
  const knob = P(side, 0.2, (dz1 + dz2) / 2)
  circle(ctx, knob[0], knob[1], 1.2 * s)
  return { side, z: (dz1 + dz2) / 2, z1: dz1, z2: dz2, idx }
}

function drawCorridor(ctx: Ctx, P: Project, distance: number, s: number): Corridor {
  const out: Corridor = { openings: [], doors: [] }
  const lw = Math.max(1, s)
  const passed = Math.floor(distance / TICK)
  const walk = distance - passed * TICK
  for (let i = SEGMENTS; i >= 0; i--) {
    const z1 = i * TICK - walk + 0.55
    if (z1 <= NEAR_CLIP) continue
    const idx = i + passed
    const sh = drawSegment(ctx, P, z1, z1 + TICK)
    drawSeams(ctx, P, z1, lw)
    const side = hash01(idx * 7) < 0.5 ? -1 : 1
    if (idx % 2 === 0) out.openings.push(drawOpening(ctx, P, side, z1, sh, lw, idx))
    else if (hash01(idx * 13) < 0.7) out.doors.push(drawDoor(ctx, P, side, z1, sh, s, idx))
  }
  return out
}

function scareInterval(): number {
  const sc = props.scene
  return randBetween(sc.scareMinS ?? DEFAULT_SCARE_MIN_S, sc.scareMaxS ?? DEFAULT_SCARE_MAX_S)
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
  nextScareAt = t + scareInterval()
}

function doorSwing(sc: Scare): number {
  const age = tNow - sc.start
  return Math.min(1, age / DOOR_SWING)
}

function limb(ctx: Ctx, a: Pt, b: Pt, wa: number, wb: number): void {
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
    const hip: Pt = [fx + side * 0.09 * k, fy + 0.35 * k]
    const knee: Pt = [hip[0] + side * (0.05 + lift * 0.1) * k, hip[1] + (0.36 - lift * 0.17) * k]
    const foot: Pt = [knee[0] + side * 0.03 * k, knee[1] + (0.42 - lift * 0.32) * k]
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
  const jx = (Math.random() - 0.5) * 6 * s
  const jy = (Math.random() - 0.5) * 4 * s
  ctx.fillStyle = withAlpha(BLACK, 0.85)
  ctx.fillRect(0, 0, w, h)
  drawHorrorFace(ctx, w * 0.5 + jx, h * 0.42 + jy, H * 1.15, seed, props.scene)
  return Math.sin(u * 90) * 8 * s
}

function drawRunner(ctx: Ctx, P: Project, w: number, h: number, f: number, age: number, s: number, sc: Scare): number {
  if (age < RUNNER_RUN) {
    const u = age / RUNNER_RUN
    const z = sc.z - (sc.z - 1) * u * u
    const [fx, fy] = P(Math.sin(age * 3) * 0.1, 0.02 * Math.abs(Math.sin(age * 15)), z)
    drawRunnerBody(ctx, fx, fy, f / z, age, sc.seed)
    return u > 0.7 ? Math.sin(age * 90) * 5 * s * (u - 0.7) / 0.3 : 0
  }
  if (age < RUNNER_SLAM) return drawSlam(ctx, w, h, age - RUNNER_RUN, s, sc.seed)
  return Math.sin(age * 70) * 4 * s
}

function drawDoorScare(ctx: Ctx, P: Project, w: number, h: number, f: number, age: number, s: number, sc: Scare): number {
  if (age < DOOR_SWING) return Math.sin(age * 120) * 3 * s
  if (age < DOOR_LUNGE) {
    const u = (age - DOOR_SWING) / (DOOR_LUNGE - DOOR_SWING)
    const z = sc.z - (sc.z - 0.95) * u
    const [fx, fy] = P(sc.side * 0.85 * (1 - u), 0.05, z)
    drawReacher(ctx, fx, fy, f / z, u, sc.seed)
    return Math.sin(age * 90) * 6 * s * u
  }
  if (age < DOOR_SLAM) return drawSlam(ctx, w, h, age - DOOR_LUNGE, s, sc.seed)
  return Math.sin(age * 70) * 4 * s
}

function drawRoom(ctx: Ctx, w: number, h: number, s: number): void {
  const { wall, floor, face } = props.scene
  ctx.fillStyle = BLACK
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

function drawRoomFigure(ctx: Ctx, P: Project, w: number, h: number, f: number, age: number, s: number, sc: Scare): number {
  if (age < ROOM_RISE) {
    const u = (age - ROOM_PULL) / (ROOM_RISE - ROOM_PULL)
    const z = 5 - 4 * u * u
    const [fx, fy] = P(0, 0.15, z)
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
  ctx.fillStyle = BLACK
  if (scare.side < 0) ctx.fillRect(0, 0, cover, h)
  else ctx.fillRect(w - cover, 0, cover, h)
}

function drawScare(ctx: Ctx, P: Project, w: number, h: number, f: number, t: number, s: number): number {
  if (!scare) return 0
  const age = t - scare.start
  if (scare.kind === 'runner') return drawRunner(ctx, P, w, h, f, age, s, scare)
  if (scare.kind === 'door') return drawDoorScare(ctx, P, w, h, f, age, s, scare)
  if (scare.kind === 'room') return roomPhase(t) === 'inside' ? drawRoomFigure(ctx, P, w, h, f, age, s, scare) : kickJolt(age, s)
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
    if (win && age > win[0] - 0.4) panic = 0.8 + Math.sin(t * 60) * 0.2
  }
  return (0.94 + Math.sin(t * 53) * 0.03 + Math.sin(t * 31) * 0.02) * dip * panic
}

function drawBeam(ctx: Ctx, w: number, h: number, lx: number, ly: number, flick: number): void {
  const R = Math.max(w, h) * 0.58 * flick
  const mask = ctx.createRadialGradient(lx, ly, 0, lx, ly, R)
  mask.addColorStop(0, withAlpha(BLACK, 0))
  mask.addColorStop(0.3, withAlpha(BLACK, 0.12))
  mask.addColorStop(0.62, withAlpha(BLACK, 0.72))
  mask.addColorStop(1, withAlpha(BLACK, 1))
  ctx.fillStyle = mask
  ctx.fillRect(0, 0, w, h)
  const warm = ctx.createRadialGradient(lx, ly, 0, lx, ly, R * 0.5)
  warm.addColorStop(0, withAlpha(props.scene.beam, 0.14))
  warm.addColorStop(1, withAlpha(props.scene.beam, 0))
  ctx.fillStyle = warm
  ctx.fillRect(0, 0, w, h)
}

function drawFlash(ctx: Ctx, w: number, h: number, t: number): void {
  if (!scare) return
  const age = t - scare.start
  const win = slamWindow()
  if (!win) return
  if (age >= win[0] && age < win[0] + 0.05) {
    ctx.fillStyle = withAlpha(WHITE, 0.35)
    ctx.fillRect(0, 0, w, h)
  }
  if (age >= win[1] && age < win[1] + 0.12) {
    ctx.fillStyle = BLACK
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
  },
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? 3 : (now - startedAt) / 1000
    tNow = t
    const s = Math.min(w, h) / 110
    const f = w * 0.38
    const phase = roomPhase(t)
    const bobAmp = phase === 'kick' ? 5 : 2.2
    const bob = Math.sin(t * 4.4) * bobAmp * s
    const sway = Math.sin(t * 2.2) * 3 * s
    const cx = w / 2 + viewShift(t, w)
    const cy = h / 2 + bob
    const P: Project = (x, y, z) => [cx + sway * 0.4 + (x * f) / z, cy + (y * f) / z]

    if (phase === 'inside') {
      drawRoom(ctx, w, h, s)
    } else {
      ctx.fillStyle = BLACK
      ctx.fillRect(0, 0, w, h)
      const corridor = drawCorridor(ctx, P, t * SPEED, s)
      if (!reduced) updateScare(t, corridor)
      drawPullMouth(ctx, w, h, t)
    }
    const jolt = reduced ? 0 : drawScare(ctx, P, w, h, f, t, s)
    const beamX = phase === 'inside' ? w / 2 : cx + sway
    drawBeam(ctx, w, h, beamX + jolt, cy - 4 * s, beamStrength(t, reduced))
    if (!reduced) drawFlash(ctx, w, h, t)
  },
})
</script>

<template>
  <canvas ref="canvas" class="hallway-scene" aria-hidden="true" />
</template>

<style scoped>
.hallway-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
