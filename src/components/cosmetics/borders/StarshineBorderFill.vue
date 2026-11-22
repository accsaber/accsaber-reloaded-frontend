<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { StarshineFill, StarshineFlow } from '@/types/cosmetics/border'
import { parseHex } from '@/utils/color'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { overlaySpace, type OverlaySpace } from '@/utils/cosmetics/overlayCanvas'
import { createRadialSprite } from '@/utils/cosmetics/sceneLayer'
import { bandToCanvas, shapeBand, type ShapeBand } from '@/utils/cosmetics/shapeBand'
import type { ShapeTrace } from '@/utils/cosmetics/shapeTrace'
import { drawGlint, glintPhase, makeGlints } from '@/utils/cosmetics/starshine'
import { hash01, randBetween as rand } from '@/utils/random'
import { useTemplateRef, watch } from 'vue'

const props = defineProps<{
  fill: StarshineFill
  margin?: number
  trace?: ShapeTrace | null
}>()

const MARGIN = props.margin ?? 25
const SPAN = 100 + MARGIN * 2
const TAU = Math.PI * 2
const STATIC_T = 3
const SPRITE_PX = 96
const POOLS = 4
const SPECKS = 46
const STREAK_PERIOD_S = 5.5
const STREAK_S = 0.9
const FLOWS: Record<StarshineFlow, [number, number]> = {
  fall: [0, 1],
  rise: [0, -1],
  drift: [0.8, 0.55],
  still: [0, 0],
}

interface Faller {
  x: number
  y: number
  r: number
  speed: number
  phase: number
}

function fallers(count: number, r: [number, number], speed: [number, number]): Faller[] {
  return Array.from({ length: count }, () => ({
    x: rand(0, SPAN),
    y: rand(0, SPAN),
    r: rand(...r),
    speed: rand(...speed),
    phase: rand(0, TAU),
  }))
}

const flow = FLOWS[props.fill.flow ?? 'fall']
const lights = fallers(props.fill.lights ?? 24, [3, 8.5], [1.6, 4.2])
const specks = fallers(SPECKS, [0.3, 0.7], [5, 11])
const glints = makeGlints(props.fill.glints ?? 9, [2, 3.6])

let band = shapeBand(props.trace)
let lightSprite: HTMLCanvasElement | null = null
let poolSprite: HTMLCanvasElement | null = null
let startTime = 0

function sprites(): { light: HTMLCanvasElement; pool: HTMLCanvasElement } {
  lightSprite ??= createRadialSprite(SPRITE_PX, parseHex(props.fill.light) ?? [0, 0, 0], [[0, 0.55], [0.55, 0.5], [0.8, 0.18], [1, 0]])
  poolSprite ??= createRadialSprite(SPRITE_PX, parseHex(props.fill.deep) ?? [0, 0, 0], [[0, 0.7], [1, 0]])
  return { light: lightSprite, pool: poolSprite }
}

function wrap(v: number): number {
  return ((v % SPAN) + SPAN) % SPAN
}

function placed(f: Faller, t: number): { x: number; y: number; fade: number } {
  const [dx, dy] = flow
  const vx = wrap(f.x + t * f.speed * dx)
  const vy = wrap(f.y + t * f.speed * dy)
  const fade = (dx ? Math.sin((Math.PI * vx) / SPAN) : 1) * (dy ? Math.sin((Math.PI * vy) / SPAN) : 1)
  return { x: vx - MARGIN, y: vy - MARGIN, fade }
}

function drawPools(ctx: Ctx, sp: OverlaySpace, t: number, sprite: HTMLCanvasElement): void {
  const r = 36 * sp.s
  for (let k = 0; k < POOLS; k++) {
    const x = sp.toX(50 + 40 * Math.cos(t * 0.07 + k * 1.7))
    const y = sp.toY(50 + 40 * Math.sin(t * 0.09 + k * 2.3))
    ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2)
  }
}

function drawLights(ctx: Ctx, sp: OverlaySpace, t: number, sprite: HTMLCanvasElement): void {
  const rings = props.fill.lightShape === 'ring'
  ctx.strokeStyle = props.fill.light
  for (const l of lights) {
    const at = placed(l, t)
    const r = l.r * sp.s * (rings ? 0.45 : 1)
    const x = sp.toX(at.x + Math.sin(t * 0.35 + l.phase) * 3)
    const y = sp.toY(at.y)
    ctx.globalAlpha = 0.55 * at.fade * (0.6 + 0.4 * Math.sin(t * 0.6 + l.phase))
    if (!rings) {
      ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2)
      continue
    }
    ctx.lineWidth = Math.max(0.6, r * 0.16)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, TAU)
    ctx.stroke()
  }
}

function drawSpecks(ctx: Ctx, sp: OverlaySpace, t: number): void {
  ctx.fillStyle = props.fill.glint
  for (const s of specks) {
    const at = placed(s, t)
    ctx.globalAlpha = at.fade * Math.max(0, Math.sin(t * (1.6 + s.r * 2.6) + s.phase)) ** 2
    ctx.beginPath()
    ctx.arc(sp.toX(at.x + Math.sin(t * 0.5 + s.phase) * 2), sp.toY(at.y), Math.max(0.5, s.r * sp.s), 0, TAU)
    ctx.fill()
  }
}

function drawGlints(ctx: Ctx, walk: ShapeBand, w: number, h: number, t: number): void {
  const unit = w / walk.vb.w
  ctx.fillStyle = props.fill.glint
  ctx.strokeStyle = props.fill.glint
  for (const g of glints) {
    const phase = glintPhase(g, t)
    const spot = phase && walk.at(hash01(g.seed + phase.cycle * 3.1))
    if (!phase || !spot) continue
    const across = (hash01(g.seed * 1.9 + phase.cycle) - 0.5) * spot.thick * 0.6
    const at = bandToCanvas(walk, { x: spot.x + spot.nx * across, y: spot.y + spot.ny * across }, w, h)
    const swell = Math.sin(Math.PI * phase.u) ** 0.6
    ctx.globalAlpha = Math.min(1, swell * 1.2)
    drawGlint(ctx, props.fill.glintShape ?? 'star', at.x, at.y, g.size * unit * swell, phase.u * 0.6 - 0.3)
  }
}

function drawStreak(ctx: Ctx, walk: ShapeBand, w: number, h: number, t: number): void {
  const cycle = Math.floor(t / STREAK_PERIOD_S)
  const u = (t - cycle * STREAK_PERIOD_S) / STREAK_S
  const spot = u < 1 ? walk.at(hash01(cycle * 5.3)) : null
  if (!spot) return
  const unit = w / walk.vb.w
  const angle = 0.5 + hash01(cycle * 9.1) * 0.6
  const from = bandToCanvas(walk, spot, w, h)
  const reach = 46 * unit * (1 - (1 - u) ** 2)
  const tail = 12 * unit * Math.sin(Math.PI * u)
  const x = from.x + Math.cos(angle) * reach
  const y = from.y + Math.sin(angle) * reach
  const tx = x - Math.cos(angle) * tail
  const ty = y - Math.sin(angle) * tail
  const grad = ctx.createLinearGradient(x, y, tx, ty)
  grad.addColorStop(0, props.fill.glint)
  grad.addColorStop(1, 'transparent')
  ctx.globalAlpha = Math.sin(Math.PI * u)
  ctx.strokeStyle = grad
  ctx.lineWidth = Math.max(0.8, 0.7 * unit)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(tx, ty)
  ctx.stroke()
}

watch(() => props.trace, (trace) => {
  band = shapeBand(trace)
})

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    startTime = now
  },
  resize() {},
  draw(ctx, w, h, now, reduced) {
    const t = reduced ? STATIC_T : ((now - startTime) / 1000) * (props.fill.speed ?? 1)
    const sp = overlaySpace(w, h, MARGIN)
    const { light, pool } = sprites()
    ctx.fillStyle = props.fill.base
    ctx.fillRect(0, 0, w, h)
    drawPools(ctx, sp, t, pool)
    ctx.globalCompositeOperation = 'lighter'
    drawLights(ctx, sp, t, light)
    drawSpecks(ctx, sp, t)
    if (band) drawGlints(ctx, band, w, h, t)
    if (band && props.fill.streaks && !reduced) drawStreak(ctx, band, w, h, t)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  },
})
</script>

<template>
  <canvas ref="canvas" class="fx-canvas" aria-hidden="true" />
</template>
