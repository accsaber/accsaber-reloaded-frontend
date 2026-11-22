<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import { useStackPointer } from '@/composables/useStackPointer'
import type { StarshineFill } from '@/types/cosmetics/border'
import { sparkle, type Ctx } from '@/utils/cosmetics/canvasShapes'
import { loopPoint, onEdge, traceShape, type ShapeTrace } from '@/utils/cosmetics/shapeTrace'
import { drawGlint, glintPhase, glitterLevel, makeGlints } from '@/utils/cosmetics/starshine'
import { smoothstep01 } from '@/utils/math'
import { hash01, randBetween as rand } from '@/utils/random'
import { useTemplateRef, watch } from 'vue'

const props = defineProps<{
  fill: StarshineFill
  margin?: number
  trace?: ShapeTrace | null
}>()

const MARGIN = props.margin ?? 25
const STACK_SHARE = 100 / (100 + MARGIN * 2)
const TAU = Math.PI * 2
const STATIC_T = 3
const RIM_STEP = 1.4
const GLEAM_PERIOD_S = 7
const GLEAM_WIDTH = 0.07
const POPS = 6
const BURST_FROM = 0.35
const BURST_DOTS = 5
const TRAIL_LIFE_S = 0.9
const TRAIL_MAX = 20
const TRAIL_STEP_PX = 16

interface RimSpeck {
  loop: number
  u: number
  dx: number
  dy: number
  r: number
  phase: number
  rate: number
  x: number
  y: number
}

interface TrailBit {
  x: number
  y: number
  vx: number
  vy: number
  born: number
  size: number
}

const pops = makeGlints(POPS, [3.2, 5.2])
let traced = traceShape(props.trace)
let rim: RimSpeck[] = []
let laidFor = ''
let trail: TrailBit[] = []
let lastSpawn: { x: number; y: number } | null = null
let startTime = 0
let clock = 0
let lastT = 0

function buildRim(): void {
  traced = traceShape(props.trace)
  laidFor = ''
  rim = traced.loops.flatMap((lp, loop) =>
    Array.from({ length: Math.round(lp.len / RIM_STEP) }, () => rand(0, 1))
      .filter((u) => onEdge(lp, u))
      .map((u) => ({ loop, u, dx: rand(-0.9, 0.9), dy: rand(-0.9, 0.9), r: rand(0.25, 0.6), phase: rand(0, TAU), rate: rand(1.4, 3.6), x: 0, y: 0 })),
  )
}

buildRim()
watch(() => props.trace, buildRim)

function layRim(w: number, h: number, unit: number): void {
  const size = `${w}x${h}`
  if (laidFor === size) return
  laidFor = size
  for (const s of rim) {
    const p = loopPoint(traced.loops[s.loop], s.u, traced.vb, w, h)
    s.x = p.x + s.dx * unit
    s.y = p.y + s.dy * unit
  }
}

function drawRim(ctx: Ctx, unit: number, t: number): void {
  ctx.fillStyle = props.fill.glint
  for (const s of rim) {
    const gleam = smoothstep01((t / GLEAM_PERIOD_S + s.loop * 0.37) % 1)
    const { lit, twinkle, alpha } = glitterLevel(t, s.rate, s.phase, Math.abs(s.u - gleam), GLEAM_WIDTH)
    const r = Math.max(0.5, s.r * unit * (1 + lit * 1.2))
    ctx.globalAlpha = alpha
    if (twinkle > 0.85 || lit > 0.6) {
      sparkle(ctx, s.x, s.y, r * 2.4)
      continue
    }
    ctx.beginPath()
    ctx.arc(s.x, s.y, r, 0, TAU)
    ctx.fill()
  }
}

function drawBurst(ctx: Ctx, x: number, y: number, r: number, u: number, seed: number): void {
  const v = (u - BURST_FROM) / (1 - BURST_FROM)
  if (v <= 0) return
  const reach = r * (0.6 + 1.6 * (1 - (1 - v) ** 3))
  ctx.globalAlpha = 1 - v
  for (let i = 0; i < BURST_DOTS; i++) {
    const a = (i / BURST_DOTS) * TAU + hash01(seed + i) * 1.2
    ctx.beginPath()
    ctx.arc(x + Math.cos(a) * reach, y + Math.sin(a) * reach, r * 0.1, 0, TAU)
    ctx.fill()
  }
}

function drawPops(ctx: Ctx, w: number, h: number, unit: number, t: number): void {
  const lp = traced.loops[traced.main]
  if (!lp) return
  ctx.fillStyle = props.fill.light
  ctx.strokeStyle = props.fill.light
  for (const g of pops) {
    const phase = glintPhase(g, t)
    if (!phase) continue
    const at = loopPoint(lp, hash01(g.seed + phase.cycle * 3.1), traced.vb, w, h)
    const swell = Math.sin(Math.PI * phase.u) ** 0.6
    const r = g.size * unit
    ctx.globalAlpha = Math.min(1, swell * 1.2)
    drawGlint(ctx, props.fill.glintShape ?? 'star', at.x, at.y, r * swell, phase.u * 0.6 - 0.3)
    drawBurst(ctx, at.x, at.y, r, phase.u, g.seed + phase.cycle)
  }
}

function drawTrail(ctx: Ctx, unit: number, dt: number): void {
  trail = trail.filter((b) => clock - b.born < TRAIL_LIFE_S)
  ctx.fillStyle = props.fill.glint
  ctx.strokeStyle = props.fill.glint
  for (const b of trail) {
    const age = (clock - b.born) / TRAIL_LIFE_S
    b.vy += 26 * dt
    b.x += b.vx * dt
    b.y += b.vy * dt
    ctx.globalAlpha = Math.sin(Math.PI * age) ** 0.7
    drawGlint(ctx, props.fill.glintShape ?? 'star', b.x, b.y, b.size * unit * (1 - age * 0.4), age * 1.4)
  }
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const pointer = useStackPointer(canvasRef, MARGIN, () => true)

function spawnTrail(w: number, h: number): void {
  const p = pointer.read()
  const x = p ? (0.5 + p.x * STACK_SHARE) * w : -1
  const y = p ? (0.5 + p.y * STACK_SHARE) * h : -1
  if (x < 0 || x > w || y < 0 || y > h) {
    lastSpawn = null
    return
  }
  if (lastSpawn && Math.hypot(x - lastSpawn.x, y - lastSpawn.y) < TRAIL_STEP_PX) return
  lastSpawn = { x, y }
  if (trail.length >= TRAIL_MAX) return
  trail.push({ x: x + rand(-3, 3), y: y + rand(-3, 3), vx: rand(-10, 10), vy: rand(-14, 4), born: clock, size: rand(1.2, 2.2) })
}

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    startTime = now
    lastT = 0
  },
  resize() {},
  draw(ctx, w, h, now, reduced) {
    clock = (now - startTime) / 1000
    const t = reduced ? STATIC_T : clock * (props.fill.speed ?? 1)
    const dt = reduced ? 0 : Math.min(0.05, clock - lastT)
    const unit = w / traced.vb.w
    lastT = clock
    ctx.clearRect(0, 0, w, h)
    layRim(w, h, unit)
    drawRim(ctx, unit, t)
    drawPops(ctx, w, h, unit, t)
    if (!reduced) spawnTrail(w, h)
    drawTrail(ctx, unit, dt)
    ctx.globalAlpha = 1
  },
})
</script>

<template>
  <canvas ref="canvas" class="fx-canvas" aria-hidden="true" />
</template>
