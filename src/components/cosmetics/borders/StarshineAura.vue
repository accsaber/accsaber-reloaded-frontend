<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import { prefersReducedMotion } from '@/composables/useReducedMotion'
import type { StarshineFill } from '@/types/cosmetics/border'
import { sparkle, type Ctx } from '@/utils/cosmetics/canvasShapes'
import { loopPoint, traceShape, type ShapeTrace, type TraceLoop } from '@/utils/cosmetics/shapeTrace'
import { drawGlint, glintPhase, makeGlints } from '@/utils/cosmetics/starshine'
import { hash01, randBetween as rand } from '@/utils/random'
import { subscribeWindowPointer } from '@/utils/windowPointer'
import { onMounted, onUnmounted, useTemplateRef, watch } from 'vue'

const props = defineProps<{
  fill: StarshineFill
  margin?: number
  trace?: ShapeTrace | null
}>()

const TAU = Math.PI * 2
const STATIC_T = 3
const RIM_STEP = 1.4
const RIM_JUMP = 4
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
let trail: TrailBit[] = []
let lastSpawn: { x: number; y: number } | null = null
let startTime = 0
let clock = 0
let lastT = 0
let stopPointer: (() => void) | null = null

function onEdge(lp: TraceLoop, u: number): boolean {
  const n = lp.pts.length - 1
  const i = Math.min(n - 1, Math.floor(u * n))
  const seg = Math.hypot(lp.pts[i + 1].x - lp.pts[i].x, lp.pts[i + 1].y - lp.pts[i].y)
  return seg < (lp.len / n) * RIM_JUMP
}

function buildRim(): void {
  traced = traceShape(props.trace)
  rim = traced.loops.flatMap((lp, loop) =>
    Array.from({ length: Math.round(lp.len / RIM_STEP) }, () => rand(0, 1))
      .filter((u) => onEdge(lp, u))
      .map((u) => ({ loop, u, dx: rand(-0.9, 0.9), dy: rand(-0.9, 0.9), r: rand(0.25, 0.6), phase: rand(0, TAU), rate: rand(1.4, 3.6) })),
  )
}

buildRim()
watch(() => props.trace, buildRim)

function gleamAt(loop: number, t: number): number {
  const f = (t / GLEAM_PERIOD_S + loop * 0.37) % 1
  return f * f * (3 - 2 * f)
}

function drawRim(ctx: Ctx, w: number, h: number, t: number): void {
  const unit = w / traced.vb.w
  ctx.fillStyle = props.fill.glint
  for (const s of rim) {
    const lp = traced.loops[s.loop]
    const gap = Math.abs(s.u - gleamAt(s.loop, t))
    const lit = Math.max(0, 1 - Math.min(gap, 1 - gap) / GLEAM_WIDTH)
    const twinkle = Math.max(0, Math.sin(t * s.rate + s.phase)) ** 3
    const p = loopPoint(lp, s.u, traced.vb, w, h)
    const x = p.x + s.dx * unit
    const y = p.y + s.dy * unit
    const r = Math.max(0.5, s.r * unit * (1 + lit * 1.2))
    ctx.globalAlpha = Math.min(1, 0.15 + twinkle * 0.85 + lit)
    if (twinkle > 0.85 || lit > 0.6) {
      sparkle(ctx, x, y, r * 2.4)
      continue
    }
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
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

function drawPops(ctx: Ctx, w: number, h: number, t: number): void {
  const lp = traced.loops[traced.main]
  if (!lp) return
  const unit = w / traced.vb.w
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

function drawTrail(ctx: Ctx, w: number, dt: number): void {
  const unit = w / traced.vb.w
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

function spawnTrail(x: number, y: number): void {
  if (lastSpawn && Math.hypot(x - lastSpawn.x, y - lastSpawn.y) < TRAIL_STEP_PX) return
  lastSpawn = { x, y }
  if (trail.length >= TRAIL_MAX) return
  trail.push({ x: x + rand(-3, 3), y: y + rand(-3, 3), vx: rand(-10, 10), vy: rand(-14, 4), born: clock, size: rand(1.2, 2.2) })
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

onMounted(() => {
  if (prefersReducedMotion() || !window.matchMedia('(hover: hover)').matches) return
  stopPointer = subscribeWindowPointer({
    measure: () => canvasRef.value?.getBoundingClientRect() ?? null,
    apply(rect, x, y) {
      const canvas = canvasRef.value
      const fx = (x - rect.left) / rect.width
      const fy = (y - rect.top) / rect.height
      if (!canvas || fx < 0 || fx > 1 || fy < 0 || fy > 1) {
        lastSpawn = null
        return
      }
      spawnTrail(fx * canvas.clientWidth, fy * canvas.clientHeight)
    },
    idle() {},
  })
})

onUnmounted(() => stopPointer?.())

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
    lastT = clock
    ctx.clearRect(0, 0, w, h)
    drawRim(ctx, w, h, t)
    drawPops(ctx, w, h, t)
    drawTrail(ctx, w, dt)
    ctx.globalAlpha = 1
  },
})
</script>

<template>
  <canvas ref="canvas" class="fx-canvas" aria-hidden="true" />
</template>
