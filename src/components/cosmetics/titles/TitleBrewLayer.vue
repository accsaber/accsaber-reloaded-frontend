<script setup lang="ts">
import TitleLayerHost from '@/components/cosmetics/titles/TitleLayerHost.vue'
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { TitleBrewSpec } from '@/types/api/items'
import { darken, lighten } from '@/utils/color'
import {
  boneShape,
  brewInk,
  brewLiquid,
  brewState,
  drawBubble,
  drawIngredient,
  skullShape,
  stepBrew,
  type BrewInk,
  type BrewRules,
  type BrewState,
} from '@/utils/cosmetics/brewScenery'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'
import { frameDelta, withAlpha } from '@/utils/cosmetics/overlayCanvas'
import { pickVariant, titleAuraRect, type TitleAuraRect } from '@/utils/cosmetics/titleAura'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'

const props = defineProps<{
  brew: TitleBrewSpec
  light: boolean
}>()

const emit = defineEmits<{
  liquid: [hex: string]
  splash: [xFrac: number]
}>()

interface Bone {
  x: number
  speed: number
  size: number
  skull: boolean
  phase: number
}

interface Wisp {
  x: number
  born: number
  life: number
  drift: number
}

const STATIC_T = 4
const RING_S = 1
const SINK_S = 0.9

let rect: TitleAuraRect | null = null
let wisps: Wisp[] = []
let ingredientIdx = 0
let last = 0

function ingredientAt(i: number) {
  const list = props.brew.ingredients
  return list[((i % list.length) + list.length) % list.length]
}

function ingredientColor(i: number): string {
  const ing = ingredientAt(i)
  return ing ? pickVariant(props.light, ing.lightColor, ing.color) : props.brew.bone
}

const rules: BrewRules = {
  gravity: 4.2,
  sinkS: SINK_S,
  ringS: RING_S,
  gap: () => rand(props.brew.dropMinS ?? 4, props.brew.dropMaxS ?? 9),
  spawn: () => {
    ingredientIdx += 1
    return { kind: ingredientAt(ingredientIdx)?.kind ?? 'eye', color: ingredientColor(ingredientIdx), x: rand(0.1, 0.9), y: -1.4, vy: 1.5, land: 0, splash: -1 }
  },
  rise: (b, dt, clock) => {
    b.y -= b.vy * dt
    b.x += Math.sin(clock * 2 + b.y * 6) * 0.03 * dt
    if (b.y <= 0.02) b.pop = 0.01
  },
  respawn: (b) => Object.assign(b, { x: rand(0, 1), y: 1, r: rand(0.05, 0.12), pop: 0 }),
}

const bones: Bone[] = Array.from({ length: 4 }, (_, i) => ({
  x: rand(0, 1),
  speed: rand(0.02, 0.045) * (i % 2 ? -1 : 1),
  size: rand(0.16, 0.24),
  skull: i === 0,
  phase: rand(0, 6.28),
}))

const sim: BrewState = brewState(
  ingredientColor(0),
  Array.from({ length: props.brew.bubbles ?? 9 }, () => ({ x: rand(0, 1), y: rand(0, 1), r: rand(0.05, 0.12), vy: rand(0.08, 0.16), pop: 0 })),
  rand(1.5, 3),
)

function surfaceY(): number {
  return rect ? rect.y + rect.h * (props.brew.surface ?? 0.66) : 0
}

function bottomY(): number {
  return rect ? rect.y + rect.h + rect.fs * 0.3 : 0
}

function stepWisps(dt: number): void {
  const clock = sim.clock
  wisps = wisps.filter((wp) => clock - wp.born < wp.life)
  if (wisps.length < 3 && Math.random() < dt * 0.6) {
    wisps.push({ x: rand(0.1, 0.9), born: clock, life: rand(2.2, 3.4), drift: rand(-0.08, 0.08) })
  }
}

function step(dt: number): void {
  const blending = sim.blend < 1
  const landed = stepBrew(sim, dt, rules)
  if (landed) emit('splash', landed.x)
  if (blending || landed) emit('liquid', brewLiquid(sim))
  stepWisps(dt)
  for (const bn of bones) bn.x = ((bn.x + bn.speed * dt) % 1 + 1) % 1
}

function surfaceAt(u: number, t: number): number {
  if (!rect) return 0
  return surfaceY() + (Math.sin(u * 9 + t * 1.7) * 0.5 + Math.sin(u * 15 - t * 2.3) * 0.3) * rect.fs * 0.045
}

function liquidPath(ctx: Ctx, t: number): void {
  if (!rect) return
  const x0 = rect.x - rect.fs * 0.45
  const x1 = rect.x + rect.w + rect.fs * 0.45
  const yb = bottomY()
  ctx.beginPath()
  ctx.moveTo(x0, surfaceAt(0, t))
  for (let i = 1; i <= 24; i++) {
    const u = i / 24
    ctx.lineTo(x0 + (x1 - x0) * u, surfaceAt(u, t))
  }
  ctx.bezierCurveTo(x1, yb + rect.fs * 0.25, x0, yb + rect.fs * 0.25, x0, surfaceAt(0, t))
  ctx.closePath()
}

function drawLiquid(ctx: Ctx, t: number, color: string): void {
  if (!rect) return
  liquidPath(ctx, t)
  const g = ctx.createLinearGradient(0, surfaceY(), 0, bottomY())
  g.addColorStop(0, darken(color, 0.2))
  g.addColorStop(1, darken(color, 0.65))
  ctx.fillStyle = g
  ctx.fill()
  ctx.save()
  liquidPath(ctx, t)
  ctx.clip()
  ctx.strokeStyle = withAlpha(lighten(color, 0.35), 0.3)
  ctx.lineWidth = Math.max(0.6, rect.fs * 0.05)
  for (let arm = 0; arm < 3; arm++) {
    ctx.beginPath()
    for (let i = 0; i <= 30; i++) {
      const u = i / 30
      const x = rect.x + rect.w * ((u + arm / 3 + t * 0.05) % 1)
      const y = surfaceY() + (bottomY() - surfaceY()) * (0.3 + 0.45 * (0.5 + 0.5 * Math.sin(u * 12 + arm * 2 + t * 0.9)))
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.restore()
  ctx.strokeStyle = withAlpha(lighten(color, 0.45), 0.5)
  ctx.lineWidth = Math.max(0.8, rect.fs * 0.05)
  ctx.beginPath()
  const x0 = rect.x - rect.fs * 0.45
  const x1 = rect.x + rect.w + rect.fs * 0.45
  for (let i = 0; i <= 24; i++) {
    const u = i / 24
    const x = x0 + (x1 - x0) * u
    if (i === 0) ctx.moveTo(x, surfaceAt(u, t))
    else ctx.lineTo(x, surfaceAt(u, t))
  }
  ctx.stroke()
}

function drawBones(ctx: Ctx, t: number, color: string): void {
  if (!rect) return
  const shade = withAlpha(color, 0.6)
  for (const bn of bones) {
    const bob = Math.sin(t * 1.6 + bn.phase) * rect.fs * 0.03
    const size = bn.size * rect.fs
    ctx.save()
    ctx.translate(rect.x + rect.w * bn.x, surfaceAt(bn.x, t) + rect.fs * 0.06 + bob)
    ctx.rotate(Math.sin(t * 0.8 + bn.phase) * 0.25)
    ctx.fillStyle = props.brew.bone
    if (bn.skull) skullShape(ctx, size, color)
    else boneShape(ctx, size)
    ctx.fillStyle = shade
    ctx.fillRect(-size * 1.4, size * 0.05 + bob * 0.5, size * 2.8, size * 1.6)
    ctx.restore()
  }
}

function drawBubbles(ctx: Ctx, ink: BrewInk): void {
  if (!rect) return
  const top = surfaceY()
  const depth = bottomY() - top
  for (const b of sim.bubbles) drawBubble(ctx, rect.x + rect.w * b.x, top + depth * b.y, b.r * rect.fs, b.pop, rect.fs * 0.04, ink)
}

function drawRings(ctx: Ctx, r: TitleAuraRect, t: number, ink: BrewInk): void {
  ctx.strokeStyle = ink.ring
  ctx.fillStyle = ink.ring
  for (const ring of sim.rings) {
    const u = ring.age / RING_S
    const x = r.x + r.w * ring.x
    const y = surfaceAt(ring.x, t)
    ctx.globalAlpha = 0.7 * (1 - u)
    ctx.lineWidth = Math.max(0.6, r.fs * (0.08 - u * 0.06))
    ctx.beginPath()
    ctx.ellipse(x, y, r.fs * (0.1 + u * 0.9), r.fs * (0.04 + u * 0.3), 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 0.8 * (1 - u)
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath()
      ctx.arc(x + k * r.fs * (0.15 + u * 0.35), y - r.fs * (u * 0.9 - u * u * 0.9 + 0.05), r.fs * 0.035 * (1 - u), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

function drawDrops(ctx: Ctx, t: number, ink: BrewInk): void {
  if (!rect) return
  drawRings(ctx, rect, t, ink)
  for (const d of sim.drops) {
    const sink = d.splash >= 0 ? d.splash / SINK_S : 0
    ctx.save()
    ctx.translate(rect.x + rect.w * d.x, surfaceAt(d.x, t) + d.y * rect.fs + sink * rect.fs * 0.35)
    ctx.globalAlpha = 1 - sink
    ctx.rotate(sink * 1.2 + (d.splash < 0 ? d.y * 0.4 : 0))
    drawIngredient(ctx, d.kind, rect.fs * 0.17, d.color, props.brew.bone)
    ctx.restore()
  }
}

function drawWisps(ctx: Ctx, t: number, color: string): void {
  if (!rect) return
  ctx.fillStyle = lighten(color, 0.6)
  for (const wp of wisps) {
    const u = (t - wp.born) / wp.life
    const x = rect.x + rect.w * (wp.x + wp.drift * u) + Math.sin(u * 7 + wp.born) * rect.fs * 0.08
    const y = surfaceY() - u * rect.fs * 1.5
    for (let k = 0; k < 3; k++) {
      const uu = Math.min(1, u + k * 0.09)
      ctx.globalAlpha = 0.1 * Math.sin(uu * Math.PI) * (1 - k * 0.25)
      ctx.beginPath()
      ctx.ellipse(x + Math.sin(uu * 9 + wp.born) * rect.fs * 0.06, y - k * rect.fs * 0.12, rect.fs * (0.05 + uu * 0.09), rect.fs * (0.07 + uu * 0.1), 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

function drawScene(ctx: Ctx, t: number): void {
  const color = brewLiquid(sim)
  const ink = brewInk(color)
  drawWisps(ctx, t, color)
  drawLiquid(ctx, t, color)
  drawBubbles(ctx, ink)
  drawBones(ctx, t, color)
  drawDrops(ctx, t, ink)
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

function measureRect(): void {
  rect = canvasRef.value ? titleAuraRect(canvasRef.value) : null
}

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    measureRect()
    last = now
    emit('liquid', brewLiquid(sim))
  },
  resize: measureRect,
  draw(ctx, w, h, now, reduced) {
    ctx.clearRect(0, 0, w, h)
    if (!rect) return
    const dt = frameDelta(now, last, reduced)
    last = now
    if (!reduced) step(dt)
    drawScene(ctx, reduced ? STATIC_T : sim.clock)
  },
})
</script>

<template>
  <TitleLayerHost>
    <canvas ref="canvas" />
  </TitleLayerHost>
</template>
