<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { BorderColorValue, BorderDryBonesOverlaySpec, DryBonesPart } from '@/types/api/items'
import { overlaySpace, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { randBetween as rand } from '@/utils/random'
import { onMounted, onUnmounted, useTemplateRef } from 'vue'

const props = defineProps<{
  overlay: BorderDryBonesOverlaySpec
  avatarUrl?: string | null
  color?: BorderColorValue | null
}>()

const MARGIN = 20
const FLOOR = 98.5
const GRAVITY = 260
const REBUILD_S = 0.5
const STAGGER_S = 0.055
const ROLL_CHANCE = 0.08
const ROLL_IN_S = 0.85
const STOMP_S = 0.5
const STOMP_COOLDOWN_S = 12
const PUFF_LIFE_S = 0.5

type Phase = 'idle' | 'collapse' | 'pile' | 'rebuild'

interface Bone {
  part: DryBonesPart
  paths: { p: Path2D; kind: string; opacity: number }[]
  dx: number
  dy: number
  a: number
  vx: number
  vy: number
  spin: number
  tx: number
  ty: number
  ta: number
  delay: number
  landed: boolean
  start: number
  fx: number
  fy: number
  fa: number
  roll: number
}

interface Puff {
  x: number
  y: number
  born: number
}

let bones: Bone[] = []
let order: Bone[] = []
let puffs: Puff[] = []
let phase: Phase = 'idle'
let clock = 0
let last = 0
let nextAt = 0
let phaseAt = 0
let hold = 3
let socketLight = 1
let shudder = 0
let chatter = 0
let dread = 0
let pointer: { x: number; y: number } | null = null
let pointerDirty = false
let insideSince = -1
let lastStomp = -100

function interval(): number {
  return rand(props.overlay.minIntervalMs ?? 14000, props.overlay.maxIntervalMs ?? 28000) / 1000
}

function skull(): Bone | undefined {
  return bones.find((b) => b.part.role === 'skull')
}

function rebuildOrder(): Bone[] {
  const rest = bones.filter((b) => !b.part.role)
  const jaw = bones.filter((b) => b.part.role === 'jaw')
  const head = bones.filter((b) => b.part.role === 'skull')
  return [...rest, ...jaw, ...head]
}

function buildBones(): void {
  bones = props.overlay.parts.map((part) => ({
    part,
    paths: part.paths.map((p) => ({ p: new Path2D(p.d), kind: p.kind, opacity: p.opacity ?? 1 })),
    dx: 0, dy: 0, a: 0, vx: 0, vy: 0, spin: 0, tx: 0, ty: 0, ta: 0,
    delay: 0, landed: true, start: 0, fx: 0, fy: 0, fa: 0, roll: 0,
  }))
}

function collapse(): void {
  phase = 'collapse'
  phaseAt = clock
  order = []
  const levels = bones.map((_, i) => i).sort(() => rand(0, 1) - 0.5)
  bones.forEach((b, i) => {
    const long = Math.abs(b.part.flat ?? 0) > 0.1 || b.part.paths.length === 2
    const absX = long ? rand(24, 76) : rand(12, 88)
    const level = b.part.role === 'skull' ? 9 : Math.min(8.5, levels[i] * 0.85)
    b.tx = absX - b.part.x
    b.ty = FLOOR - 1.6 - level - b.part.y
    b.ta = (b.part.flat ?? 0) + rand(-0.35, 0.35)
    b.delay = rand(0, 0.3)
    b.landed = false
    b.roll = 0
    b.vx = rand(-6, 6)
    b.vy = -rand(0, 14)
    b.spin = rand(-7, 7)
  })
  const head = skull()
  if (head && rand(0, 1) < ROLL_CHANCE) head.roll = rand(0, 1) < 0.5 ? -1 : 1
}

function land(b: Bone): void {
  b.dy = b.ty
  puffs.push({ x: b.part.x + b.dx, y: FLOOR, born: clock })
  if (b.vy > 40) {
    b.vy = -b.vy * 0.3
    return
  }
  b.landed = true
  b.a = b.ta
  order.push(b)
  if (b.roll) {
    b.vx = 42 * b.roll
    b.spin = 9 * b.roll
  }
}

function stepFalling(b: Bone, dt: number): void {
  if (clock - phaseAt < b.delay) return
  b.vy += GRAVITY * dt
  b.dy += b.vy * dt
  b.dx += (b.tx - b.dx) * Math.min(1, 3 * dt)
  b.a += b.spin * dt
  if (b.dy >= b.ty) land(b)
}

function stepRolling(b: Bone, dt: number): void {
  const absX = b.part.x + b.dx
  if (absX < -24 || absX > 124) return
  b.dx += b.vx * dt
  b.a += b.spin * dt
}

function stepCollapse(dt: number): void {
  for (const b of bones) {
    if (!b.landed) stepFalling(b, dt)
    else if (b.roll) stepRolling(b, dt)
  }
  if (bones.every((b) => b.landed)) {
    phase = 'pile'
    phaseAt = clock
    hold = rand(2.6, 3.6)
  }
}

function beginRebuild(): void {
  phase = 'rebuild'
  phaseAt = clock
  rebuildOrder().forEach((b, i) => {
    b.start = clock + i * STAGGER_S
    b.fx = b.dx
    b.fy = b.dy
    b.fa = Math.atan2(Math.sin(b.a), Math.cos(b.a))
  })
}

function easeInOut(u: number): number {
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
}

function stepRollIn(b: Bone, u: number): void {
  const rollU = Math.min(1, u * (ROLL_IN_S + REBUILD_S) / ROLL_IN_S)
  if (rollU < 1) {
    b.dx = b.fx * (1 - rollU)
    b.dy = b.ty
    b.a = b.fa - b.roll * rollU * 6
    return
  }
  const hopU = (u * (ROLL_IN_S + REBUILD_S) - ROLL_IN_S) / REBUILD_S
  const e = easeInOut(hopU)
  b.dx = 0
  b.dy = b.ty * (1 - e) - Math.sin(hopU * Math.PI) * 10
  b.a = (b.fa - b.roll * 6) * (1 - e)
}

function stepFlyBack(b: Bone): void {
  const total = b.roll ? ROLL_IN_S + REBUILD_S : REBUILD_S
  const u = Math.min(1, Math.max(0, (clock - b.start) / total))
  if (b.roll) {
    stepRollIn(b, u)
    return
  }
  const e = easeInOut(u)
  b.dx = b.fx * (1 - e)
  b.dy = b.fy * (1 - e) - Math.sin(u * Math.PI) * 8
  b.a = b.fa * (1 - e)
}

function finishRebuild(): void {
  phase = 'idle'
  shudder = 0.5
  chatter = 1
  nextAt = clock + interval()
  for (const b of bones) {
    b.dx = 0
    b.dy = 0
    b.a = 0
    b.roll = 0
  }
}

function stepRebuild(): void {
  for (const b of bones) stepFlyBack(b)
  const head = skull()
  const total = head?.roll ? ROLL_IN_S + REBUILD_S : REBUILD_S
  if (head && clock >= head.start + total) finishRebuild()
}

function readPointer(canvas: HTMLCanvasElement): void {
  if (!pointerDirty) return
  pointerDirty = false
  if (!pointer) {
    dread = 0
    insideSince = -1
    return
  }
  const rect = canvas.getBoundingClientRect()
  const stackW = rect.width / 1.4
  const stackH = rect.height / 1.4
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const nx = Math.abs(pointer.x - cx) / stackW
  const ny = Math.abs(pointer.y - cy) / stackH
  const d = Math.max(nx, ny)
  dread = Math.max(0, Math.min(1, (1.3 - d) / 0.8))
  const inside = nx < 0.5 && ny < 0.5
  if (!inside) insideSince = -1
  else if (insideSince < 0) insideSince = clock
}

function stepIdle(): void {
  if (clock >= nextAt) {
    collapse()
    return
  }
  const stomped = insideSince >= 0 && clock - insideSince >= STOMP_S && clock - lastStomp >= STOMP_COOLDOWN_S
  if (stomped) {
    lastStomp = clock
    insideSince = -1
    collapse()
  }
}

function step(dt: number): void {
  shudder = Math.max(0, shudder - dt)
  chatter = Math.max(0, chatter - dt * 1.6)
  puffs = puffs.filter((p) => clock - p.born < PUFF_LIFE_S)
  if (phase === 'idle') stepIdle()
  else if (phase === 'collapse') stepCollapse(dt)
  else if (phase === 'pile' && clock - phaseAt >= hold) beginRebuild()
  else if (phase === 'rebuild') stepRebuild()
}

function jitter(seed: number, amp: number): [number, number] {
  if (amp <= 0) return [0, 0]
  const t = clock * 47 + seed * 1.7
  return [Math.sin(t) * amp, Math.cos(t * 1.3 + seed) * amp]
}

function jitterAmp(): number {
  const rattle = phase === 'pile' && clock - phaseAt > hold - 0.6 ? 0.5 : 0
  const idle = phase === 'idle' ? Math.max(shudder, dread * 0.35) : 0
  return Math.max(rattle, idle)
}

function jawOpen(): number {
  if (phase !== 'idle') return 0
  const amp = Math.max(chatter, dread)
  return Math.abs(Math.sin(clock * 44)) * 1.9 * amp
}

function socketHex(): string {
  const fill = props.color?.states?.[0]?.fill
  if (fill?.type === 'solid') return fill.hex
  if (fill && (fill.type === 'linear' || fill.type === 'radial' || fill.type === 'conic') && fill.stops[0]) return fill.stops[0].hex
  return props.overlay.rim
}

function paint(ctx: CanvasRenderingContext2D, entry: Bone['paths'][number], lit: string): void {
  const o = props.overlay
  if (entry.kind === 'crack') {
    ctx.strokeStyle = o.crack
    ctx.lineWidth = 0.35
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke(entry.p)
    return
  }
  if (entry.kind === 'socket') {
    ctx.fillStyle = o.dark
    ctx.fill(entry.p)
    ctx.fillStyle = withAlpha(lit, socketLight)
    ctx.fill(entry.p)
    ctx.strokeStyle = withAlpha(o.rim, 0.7)
    ctx.lineWidth = 0.6
    ctx.stroke(entry.p)
    return
  }
  const color = entry.kind === 'bone' ? o.bone : entry.kind === 'shade' ? o.shade : o.dark
  ctx.fillStyle = entry.opacity < 1 ? withAlpha(color, entry.opacity) : color
  ctx.fill(entry.p)
}

function drawBone(ctx: CanvasRenderingContext2D, b: Bone, i: number, amp: number, lit: string): void {
  const [jx, jy] = jitter(i, amp)
  const open = b.part.role === 'jaw' ? jawOpen() : 0
  ctx.save()
  ctx.translate(b.part.x + b.dx + jx, b.part.y + b.dy + jy + open)
  ctx.rotate(b.a)
  ctx.translate(-b.part.x, -b.part.y)
  for (const entry of b.paths) paint(ctx, entry, lit)
  ctx.restore()
}

function drawPuffs(ctx: CanvasRenderingContext2D): void {
  for (const p of puffs) {
    const age = (clock - p.born) / PUFF_LIFE_S
    ctx.fillStyle = withAlpha(props.overlay.shade, 0.45 * (1 - age))
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath()
      ctx.arc(p.x + k * (2 + age * 4), p.y - age * 3, 1 + age * 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function drawOrder(): Bone[] {
  if (phase === 'collapse' || phase === 'pile') {
    const airborne = bones.filter((b) => !order.includes(b))
    return [...order, ...airborne]
  }
  return bones
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const { sx, sy, toX, toY } = overlaySpace(w, h, MARGIN)
  const lit = socketHex()
  const amp = jitterAmp()
  ctx.save()
  ctx.translate(toX(0), toY(0))
  ctx.scale(sx, sy)
  drawPuffs(ctx)
  drawOrder().forEach((b, i) => drawBone(ctx, b, i, amp, lit))
  ctx.restore()
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
    buildBones()
    order = []
    puffs = []
    phase = 'idle'
    clock = 0
    last = nowMs
    socketLight = 1
    shudder = 0
    chatter = 0
    dread = 0
    nextAt = interval() * rand(0.2, 0.4)
  },
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (reduced) {
      socketLight = 1
      drawScene(ctx, w, h)
      return
    }
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    clock += dt
    if (canvasRef.value) readPointer(canvasRef.value)
    step(dt)
    const litTarget = phase === 'idle' ? 1 : 0
    socketLight += (litTarget - socketLight) * Math.min(1, dt * (litTarget ? 6 : 14))
    drawScene(ctx, w, h)
  },
})
</script>

<template>
  <canvas ref="canvas" class="border-drybones" aria-hidden="true" />
</template>

<style scoped>
.border-drybones {
  position: absolute;
  inset: -20%;
  width: 140%;
  height: 140%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
