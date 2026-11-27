<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import { useStackPointer } from '@/composables/useStackPointer'
import type { LightsFill, LightsPattern } from '@/types/cosmetics/border'
import { darken, lerpHex, parseHex } from '@/utils/color'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { createRadialSprite } from '@/utils/cosmetics/sceneLayer'
import { bandToCanvas, shapeBand, type BandSpot, type ShapeBand } from '@/utils/cosmetics/shapeBand'
import type { ShapeTrace } from '@/utils/cosmetics/shapeTrace'
import { clamp, clamp01, smoothstep01 } from '@/utils/math'
import { hash01, randBetween as rand } from '@/utils/random'
import { useTemplateRef, watch } from 'vue'

const props = defineProps<{
  fill: LightsFill
  margin?: number
  trace?: ShapeTrace | null
}>()

const MARGIN = props.margin ?? 25
const TAU = Math.PI * 2
const STATIC_T = 3
const SPACING = 9
const WALK_SAMPLES = 480
const SMOOTH = 7
const SMOOTH_REACH = 9
const BODY_MID = 1.5
const BODY_WIDTH = 3.7
const PATTERN_S = 6
const BLEND_SHARE = 0.12
const CLICK_BLEND_S = 0.35
const BURN_PERIOD_S = 17
const FLICKER_S = 0.7
const DARK_S = 2.4
const RELIGHT_S = 0.5
const POOL_PX = 64
const SHAPES: Record<NonNullable<LightsFill['bulb']>, Path2D | null> = { drop: null, globe: null, icicle: null }
const SHAPE_PATHS = {
  drop: 'M0,-0.55 C1.2,-1.3 3,-0.9 3,0 C3,0.9 1.2,1.3 0,0.55 Z',
  globe: 'M0.2,0 A1.25,1.25 0 1 1 2.7,0 A1.25,1.25 0 1 1 0.2,0 Z',
  icicle: 'M0,-0.5 C1.6,-0.5 3,-0.2 4,0 C3,0.2 1.6,0.5 0,0.5 Z',
}

interface Bulb {
  spot: BandSpot
  scale: number
  tone: number
  color: string
  dim: string
  phase: number
  rate: number
}

let band: ShapeBand | null = null
let bulbs: Bulb[] = []
let pools = new Map<string, HTMLCanvasElement>()
let startTime = 0
let offset = 0
let clickAt = -10

function spread(walk: ShapeBand, count: number): BandSpot[] {
  const raw = Array.from({ length: WALK_SAMPLES }, (_, i) => walk.at(i / WALK_SAMPLES)).filter((s): s is BandSpot => !!s)
  const n = raw.length
  if (!n) return []
  const path = raw.map((spot, i) => {
    let x = 0
    let y = 0
    let used = 0
    for (let k = -SMOOTH; k <= SMOOTH; k++) {
      const near = raw[(i + k + n) % n]
      if (Math.hypot(near.x - spot.x, near.y - spot.y) > SMOOTH_REACH) continue
      x += near.x
      y += near.y
      used++
    }
    return { ...spot, x: x / used, y: y / used }
  })
  const along = [0]
  for (let i = 1; i <= n; i++) along.push(along[i - 1] + Math.hypot(path[i % n].x - path[i - 1].x, path[i % n].y - path[i - 1].y))
  let k = 0
  return Array.from({ length: count }, (_, i) => {
    while (k < n - 1 && along[k] < ((i + 0.5) / count) * along[n]) k++
    return path[k]
  })
}

function bulbAt(spot: BandSpot, i: number, tones: number): Bulb {
  const color = props.fill.colors[i % tones]
  return {
    spot,
    scale: clamp(spot.thick / BODY_WIDTH, 0.4, 1),
    tone: i % tones,
    color,
    dim: darken(color, 0.72),
    phase: rand(0, TAU),
    rate: rand(1.2, 3),
  }
}

function build(): void {
  band = shapeBand(props.trace)
  pools = new Map()
  bulbs = []
  const tones = props.fill.colors.length
  if (!band || !tones) return
  let count = props.fill.count ?? Math.max(tones, Math.round(band.length / SPACING / tones) * tones)
  let spots = spread(band, count)
  for (let tries = 0; tries < tones && spots.length % tones; tries++) spots = spread(band, --count)
  bulbs = spots.map((spot, i) => bulbAt(spot, i, tones))
}

build()
watch([() => props.trace, () => props.fill], build)

function shapePath(): Path2D {
  const key = props.fill.bulb ?? 'drop'
  return (SHAPES[key] ??= new Path2D(SHAPE_PATHS[key]))
}

function pool(color: string): HTMLCanvasElement {
  let sprite = pools.get(color)
  if (!sprite) {
    sprite = createRadialSprite(POOL_PX, parseHex(color) ?? [0, 0, 0], [[0, 0.5], [0.4, 0.2], [1, 0]])
    pools.set(color, sprite)
  }
  return sprite
}

function patternLevel(pattern: LightsPattern, b: Bulb, i: number, t: number, drop: number): number {
  if (pattern === 'chase') return Math.max(0, Math.cos((i - t * 3.2) * (TAU / 3))) ** 2
  if (pattern === 'alternate') return clamp01(0.5 + Math.sin(Math.PI * t * 1.2 + i * Math.PI) * 2.2)
  if (pattern === 'twinkle') return 0.2 + 0.8 * Math.max(0, Math.sin(t * b.rate + b.phase)) ** 2
  if (pattern === 'wave') return (0.5 + 0.5 * Math.sin(i * 0.55 - t * 2.2)) ** 1.6
  if (pattern === 'cascade') return Math.max(0, Math.sin((drop * 2.4 - t * 0.9) * Math.PI)) ** 3
  if (pattern === 'sequential') return Math.max(0, Math.cos((b.tone - t * 1.1) * (TAU / props.fill.colors.length))) ** 4
  if (pattern === 'fade') return 0.5 + 0.5 * Math.sin(t * 1.3 + (i % 2) * Math.PI)
  if (pattern === 'steady') return 1
  return 0.55 + 0.45 * Math.sin(t * 1.1 + b.phase * 0.2)
}

function programLevel(b: Bulb, i: number, t: number, drop: number, shift: number): number {
  const program = props.fill.program
  const slot = t / PATTERN_S
  const index = Math.floor(slot) + shift
  const now = patternLevel(program[index % program.length], b, i, t, drop)
  const blend = (slot - Math.floor(slot) - (1 - BLEND_SHARE)) / BLEND_SHARE
  if (blend <= 0) return now
  const next = patternLevel(program[(index + 1) % program.length], b, i, t, drop)
  return now + (next - now) * smoothstep01(blend)
}

function level(b: Bulb, i: number, t: number, drop: number): number {
  const current = programLevel(b, i, t, drop, offset)
  const since = (t - clickAt) / CLICK_BLEND_S
  if (since >= 1) return current
  return programLevel(b, i, t, drop, offset - 1) * (1 - since) + current * since
}

function burn(i: number, t: number): { dim: number; flash: number } {
  const cycle = Math.floor(t / BURN_PERIOD_S)
  if (Math.floor(hash01(cycle * 7.3) * bulbs.length) !== i) return { dim: 1, flash: 0 }
  const local = t - cycle * BURN_PERIOD_S - BURN_PERIOD_S * 0.4
  if (local < 0) return { dim: 1, flash: 0 }
  if (local < FLICKER_S) return { dim: hash01(Math.floor(local * 22) + cycle) < 0.5 ? 1 : 0.1, flash: 0 }
  if (local < FLICKER_S + DARK_S) return { dim: 0, flash: 0 }
  const back = clamp01((local - FLICKER_S - DARK_S) / RELIGHT_S)
  return { dim: back, flash: Math.sin(back * Math.PI) }
}

function drawPool(ctx: Ctx, b: Bulb, x: number, y: number, reach: number, lit: number): void {
  if (reach <= 0.5) return
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = lit
  ctx.drawImage(pool(b.color), x - reach, y - reach, reach * 2, reach * 2)
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
}

function drawBulb(ctx: Ctx, walk: ShapeBand, b: Bulb, i: number, t: number, w: number, h: number): void {
  const at = bandToCanvas(walk, b.spot, w, h)
  const unit = (w / walk.vb.w) * b.scale
  const state = burn(i, t)
  const lit = level(b, i, t, at.y / h) * state.dim
  drawPool(ctx, b, at.x, at.y, unit * 6 * lit, lit)
  const size = unit * (props.fill.size ?? 1)
  ctx.save()
  ctx.translate(at.x, at.y)
  ctx.rotate(Math.atan2(b.spot.ny, b.spot.nx))
  ctx.scale(size, size)
  ctx.translate(-BODY_MID, 0)
  ctx.fillStyle = props.fill.wire
  ctx.fillRect(-0.7, -0.6, 0.9, 1.2)
  ctx.fillStyle = lerpHex(lerpHex(b.dim, b.color, lit), props.fill.flash ?? b.color, state.flash)
  ctx.fill(shapePath())
  ctx.restore()
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')
const pointer = useStackPointer(canvasRef, MARGIN, () => props.fill.hover !== false)

function pressed(t: number): void {
  const at = pointer.takePress()
  if (!at || at.nx > 0.56 || at.ny > 0.56) return
  offset += 1
  clickAt = t
}

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    startTime = now
  },
  resize() {},
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : ((now - startTime) / 1000) * (props.fill.speed ?? 1)
    ctx.fillStyle = props.fill.base
    ctx.fillRect(0, 0, w, h)
    if (!band) return
    if (!reduced) pressed(t)
    const walk = band
    bulbs.forEach((b, i) => drawBulb(ctx, walk, b, i, t, w, h))
  },
})
</script>

<template>
  <canvas ref="canvas" class="fx-canvas" aria-hidden="true" />
</template>
