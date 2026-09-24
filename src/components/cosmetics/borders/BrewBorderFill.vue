<script setup lang="ts">
import { useElementCanvas } from '@/composables/useCanvasScene'
import type { BrewFill } from '@/types/api/items'
import {
  BREW_INGREDIENT_KINDS,
  boneShape,
  brewInk,
  brewLiquid,
  brewState,
  drawBubble,
  drawIngredient,
  skullShape,
  stepBrew,
  swirlArms,
  type BrewInk,
  type BrewRules,
  type BrewState,
} from '@/utils/cosmetics/brewScenery'
import { darken, lighten } from '@/utils/color'
import { frameDelta, framePoint, overlaySpace, withAlpha, type OverlaySpace } from '@/utils/cosmetics/overlayCanvas'
import { randBetween as rand } from '@/utils/random'
import { useTemplateRef } from 'vue'
import type { Ctx } from '@/utils/cosmetics/canvasShapes'

const props = defineProps<{
  fill: BrewFill
  margin?: number
}>()

interface Bone {
  u: number
  inset: number
  speed: number
  size: number
  skull: boolean
  phase: number
}

const MARGIN = props.margin ?? 25
const STATIC_T = 3
const RING_S = 1.2
const SINK_S = 0.9

let paletteIdx = 0
let last = 0
let vignette: CanvasGradient | null = null

function nextColor(): string {
  const cs = props.fill.colors
  paletteIdx = (paletteIdx + 1) % cs.length
  return cs[paletteIdx] ?? props.fill.bone
}

function landing(): { x: number; y: number } {
  const side = Math.floor(rand(0, 4))
  if (side === 0) return { x: rand(-14, 114), y: rand(-12, 8) }
  if (side === 1) return { x: rand(-14, 114), y: rand(92, 112) }
  if (side === 2) return { x: rand(-14, 8), y: rand(10, 90) }
  return { x: rand(92, 114), y: rand(10, 90) }
}

const rules: BrewRules = {
  gravity: 160,
  sinkS: SINK_S,
  ringS: RING_S,
  gap: () => rand(props.fill.dropMinS ?? 5, props.fill.dropMaxS ?? 11),
  spawn: () => {
    const at = landing()
    const kind = BREW_INGREDIENT_KINDS[Math.floor(Math.random() * BREW_INGREDIENT_KINDS.length)] ?? 'eye'
    return { kind, color: nextColor(), x: at.x, y: at.y - 60, vy: 90, land: at.y, splash: -1 }
  },
  rise: (b, dt, clock) => {
    b.y -= b.vy * dt
    b.x += Math.sin(clock * 2 + b.y * 0.2) * 3 * dt
    if (b.y < rand(-25, 30) && Math.random() < 0.02) b.pop = 0.01
    if (b.y < -25) b.y = 125
  },
  respawn: (b) => Object.assign(b, { x: rand(-20, 120), y: 125, r: rand(0.8, 2.4), pop: 0 }),
}

const bones: Bone[] = Array.from({ length: 7 }, (_, i) => ({
  u: rand(0, 1),
  inset: rand(1.5, 5),
  speed: rand(0.02, 0.035) * (i % 2 ? 1 : -1),
  size: rand(5, 8),
  skull: i === 0,
  phase: rand(0, 6.28),
}))

const brew: BrewState = brewState(
  props.fill.colors[0] ?? props.fill.bone,
  Array.from({ length: props.fill.bubbles ?? 14 }, () => ({ x: rand(-20, 120), y: rand(-20, 120), r: rand(0.8, 2.4), vy: rand(4, 9), pop: 0 })),
  rand(2, 5),
)

function drawSwirl(ctx: Ctx, w: number, h: number, sx: number, t: number, color: string): void {
  ctx.lineWidth = Math.max(1, 1.4 * sx)
  ctx.strokeStyle = withAlpha(lighten(color, 0.35), 0.16)
  swirlArms(ctx, w * 0.5, h * 0.5, sx, t * 0.35, 4)
  ctx.strokeStyle = withAlpha(darken(color, 0.4), 0.2)
  swirlArms(ctx, w * 0.5, h * 0.5, sx, t * 0.35 + 1, 8)
}

function drawBones(ctx: Ctx, w: number, h: number, sp: OverlaySpace, t: number, color: string): void {
  const shade = withAlpha(color, 0.55)
  for (const bn of bones) {
    const p = framePoint(bn.u, bn.inset)
    const bob = Math.sin(t * 1.6 + bn.phase) * 0.6
    const size = bn.size * sp.sx
    ctx.save()
    ctx.translate(w * 0.5 + (p.x - 50) * sp.sx, h * 0.5 + (p.y - 50 + bob) * sp.sy)
    ctx.rotate(p.angle + Math.sin(t + bn.phase) * 0.2)
    ctx.fillStyle = props.fill.bone
    if (bn.skull) skullShape(ctx, size, color)
    else boneShape(ctx, size)
    ctx.fillStyle = shade
    ctx.fillRect(-size * 1.3, size * (0.1 + bob * 0.2), size * 2.6, size * 2)
    ctx.restore()
  }
}

function drawDrops(ctx: Ctx, sp: OverlaySpace, ink: BrewInk): void {
  ctx.strokeStyle = ink.ring
  for (const r of brew.rings) {
    const u = r.age / RING_S
    ctx.globalAlpha = 0.7 * (1 - u)
    ctx.lineWidth = Math.max(0.8, (2 - u * 1.5) * sp.sx)
    ctx.beginPath()
    ctx.ellipse(sp.toX(r.x), sp.toY(r.y), (3 + u * 26) * sp.sx, (1.5 + u * 12) * sp.sx, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  for (const d of brew.drops) {
    const sink = d.splash >= 0 ? d.splash / SINK_S : 0
    ctx.save()
    ctx.translate(sp.toX(d.x), sp.toY(d.y) + sink * 6 * sp.sx)
    ctx.globalAlpha = 1 - sink
    ctx.rotate(sink * 1.2)
    drawIngredient(ctx, d.kind, 3.2 * sp.sx, d.color, props.fill.bone)
    ctx.restore()
  }
}

function drawVignette(ctx: Ctx, w: number, h: number): void {
  if (!vignette) {
    vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.2, w * 0.5, h * 0.5, Math.max(w, h) * 0.75)
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.25)')
  }
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
}

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

useElementCanvas(canvasRef, {
  init(_w, _h, now) {
    last = now
  },
  resize() {
    vignette = null
  },
  draw(ctx, w, h, now, reduced) {
    const dt = frameDelta(now, last, reduced)
    last = now
    if (!reduced) {
      stepBrew(brew, dt, rules)
      for (const bn of bones) bn.u += bn.speed * dt
    }
    const t = reduced ? STATIC_T : brew.clock
    const sp = overlaySpace(w, h, MARGIN)
    const color = brewLiquid(brew)
    const ink = brewInk(color)
    ctx.fillStyle = color
    ctx.fillRect(0, 0, w, h)
    drawVignette(ctx, w, h)
    drawSwirl(ctx, w, h, sp.sx, t, color)
    drawBones(ctx, w, h, sp, t, color)
    for (const b of brew.bubbles) drawBubble(ctx, sp.toX(b.x), sp.toY(b.y), b.r * sp.sx, b.pop, 0.6 * sp.sx, ink)
    drawDrops(ctx, sp, ink)
  },
})
</script>

<template>
  <canvas ref="canvas" class="brew-border-fill" aria-hidden="true" />
</template>

<style scoped>
.brew-border-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  pointer-events: none;
}
</style>
